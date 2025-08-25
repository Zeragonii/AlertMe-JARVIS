document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const keepAwakeCheckbox = document.getElementById("keepAwake");
    const enableSoundCheckbox = document.getElementById("enableSound");
    const checkIntervalInput = document.getElementById("checkInterval");
    const checkIntervalValue = document.getElementById("checkIntervalValue");
    const enableMonitoringCheckbox = document.getElementById("enableMonitoring");
    const monitorUrlInput = document.getElementById("monitorUrl"); // ⚠️ InfoSec: user-supplied URL for monitoring
    const version = chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = `v${version}`;

    // Disable monitoring checkbox until a valid URL is present
    // ⚠️ InfoSec might flag: enabling/disabling features based on user input
    enableMonitoringCheckbox.disabled = !monitorUrlInput.value.trim();

    // Function to validate URL and enable/disable checkbox
    // ⚠️ InfoSec: URL parsing; this could be a source of malformed input if later used unsafely
    function validateUrl(url) {
        try {
            new URL(url);
            enableMonitoringCheckbox.disabled = false;
        } catch {
            enableMonitoringCheckbox.disabled = true;
            enableMonitoringCheckbox.checked = false;
        }
    }

    // Debounce utility
    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const validateUrlDebounced = debounce(validateUrl, 300);

    // Run validation on input
    monitorUrlInput.addEventListener("input", (e) => {
        validateUrlDebounced(e.target.value.trim());
    });

    // Run validation on page load
    validateUrlDebounced(monitorUrlInput.value.trim());

    // Load saved preferences
    // ⚠️ InfoSec: local storage contains user settings and URL for monitoring
    chrome.storage.local.get(
        { keepAwake: false, checkIntervalMinutes: 1, monitorUrl: "" },
        (data) => {
            keepAwakeCheckbox.checked = data.keepAwake;
            checkIntervalInput.value = data.checkIntervalMinutes;
            checkIntervalValue.textContent = data.checkIntervalMinutes;
            monitorUrlInput.value = data.monitorUrl; // restore saved URL
        }
    );

    chrome.storage.local.get({ enableSound: false, monitorEnabled: false }, (data) => {
        enableSoundCheckbox.checked = data.enableSound;
        enableMonitoringCheckbox.checked = data.monitorEnabled;
    });

    // Save preferences when checkboxes change
    keepAwakeCheckbox.addEventListener("change", () => {
        // ⚠️ InfoSec: changing keepAwake affects system power state
        chrome.storage.local.set({ keepAwake: keepAwakeCheckbox.checked }, () => {
            console.log("[Options] KeepAwake set to:", keepAwakeCheckbox.checked);
        });
    });

    enableSoundCheckbox.addEventListener("change", () => {
        chrome.storage.local.set({ enableSound: enableSoundCheckbox.checked }, () => {
            console.log("[Options] enableSound set to:", enableSoundCheckbox.checked);
        });
    });

    // Save check interval with debounce
    const saveCheckInterval = debounce((val) => {
        chrome.storage.local.set({ checkIntervalMinutes: val }, () => {
            if (chrome.runtime.lastError) {
                console.warn("[Options] Storage quota error:", chrome.runtime.lastError.message);
            } else {
                console.log("[Options] Check interval set to:", val, "minutes");
            }
        });
    }, 500);

    // Slider events
    checkIntervalInput.addEventListener("input", (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        checkIntervalValue.textContent = val;
        saveCheckInterval(val);
    });

    // Save monitoring enabled/disabled
    enableMonitoringCheckbox.addEventListener("change", () => {
        // ⚠️ InfoSec: enabling monitoring triggers background processes
        chrome.storage.local.set({ monitorEnabled: enableMonitoringCheckbox.checked }, () => {
            console.log("[Options] monitorEnabled set to:", enableMonitoringCheckbox.checked);
        });
    });

    // Save URL input with debounce (no validation, trust the user)
    // ⚠️ InfoSec: user-supplied URL is stored and later used for automated tab monitoring
    const saveMonitorUrl = debounce((url) => {
        const trimmedUrl = url.trim();
        chrome.storage.local.set({ monitorUrl: trimmedUrl }, () => {
            console.log("[Options] monitorUrl set to:", trimmedUrl);
            // Enable the monitoring checkbox now that we have a URL
            enableMonitoringCheckbox.disabled = trimmedUrl === "";
        });
    }, 800);

    // Handle URL input
    monitorUrlInput.addEventListener("input", (e) => {
        saveMonitorUrl(e.target.value);
    });
});
