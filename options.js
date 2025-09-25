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

    // Function to validate URL and enable/disable checkbox
    // ⚠️ InfoSec: URL parsing; this could be a source of malformed input if later used unsafely
    function validateUrl(url) {
        try {
            new URL(url);
            enableMonitoringCheckbox.disabled = false;
            console.log("[Options] validateUrl → monitoring checkbox enabled");
        } catch {
            enableMonitoringCheckbox.disabled = true;
            enableMonitoringCheckbox.checked = false;
            console.log("[Options] validateUrl → monitoring checkbox disabled due to invalid URL");
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

    // Load saved preferences (merged into one call)
    // ⚠️ InfoSec: local storage contains user settings and URL for monitoring
    chrome.storage.local.get(
        { keepAwake: false, checkIntervalMinutes: 1, monitorUrl: "", enableSound: false, monitorEnabled: false, langOverride: null },
        (data) => {
            keepAwakeCheckbox.checked = data.keepAwake;
            checkIntervalInput.value = data.checkIntervalMinutes;
            checkIntervalValue.textContent = data.checkIntervalMinutes;
            monitorUrlInput.value = data.monitorUrl; // restore saved URL

            // ✅ Enable or disable monitoring checkbox based on saved URL
            enableMonitoringCheckbox.disabled = data.monitorUrl.trim() === "";
            console.log("[Options] Loaded monitorUrl, checkbox disabled:", enableMonitoringCheckbox.disabled);

            // Restore sound + monitoring states
            enableSoundCheckbox.checked = data.enableSound;
            enableMonitoringCheckbox.checked = data.monitorEnabled && !enableMonitoringCheckbox.disabled;
            console.log("[Options] Loaded monitorEnabled state:", enableMonitoringCheckbox.checked);

            // ✅ Now validate AFTER the URL has been restored
            validateUrlDebounced(monitorUrlInput.value.trim());

            // Restore language override if present
            if (data.langOverride) {
                overrideCheckbox.checked = true;
                languageSelect.disabled = false;
                languageSelect.value = data.langOverride;
            }
        }
    );

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
            console.log("[Options] Monitoring checkbox disabled:", enableMonitoringCheckbox.disabled);
        });
    }, 800);

    // Handle URL input
    monitorUrlInput.addEventListener("input", (e) => {
        saveMonitorUrl(e.target.value);
    });

    // Map language codes to user-friendly names
    const languageNames = {
      "en": "English",
      "es": "Spanish",
      "pt-BR": "Portuguese (Brazil)",
      "pt-PT": "Portuguese (Portugal)",
      "fr": "French",
      "zh-Hans": "Chinese (Simplified)",
      "zh-Hant": "Chinese (Traditional)",
      "ja": "Japanese",
      "ko": "Korean",
      "de": "German",
      "it": "Italian",
      "nl": "Dutch",
      "id": "Indonesian",
      "ar": "Arabic",
      "ms": "Malaysian",
      "pl": "Polish",
      "sv": "Swedish",
      "fi": "Finnish",
      "tr": "Turkish",
      "hi": "Hindi"
    };

    const overrideCheckbox = document.getElementById("overrideLang");
    const languageSelect = document.getElementById("languageSelect");

    // Populate the dropdown
    Object.entries(languageNames).forEach(([code, name]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      languageSelect.appendChild(option);
    });

    // Enable/disable dropdown based on checkbox
    overrideCheckbox.addEventListener("change", () => {
      languageSelect.disabled = !overrideCheckbox.checked;

      if (!overrideCheckbox.checked) {
        chrome.storage.local.remove("langOverride", () => {
          console.log("[Options] Language override removed");
          // Re-apply translations using browser language
          i18nReload();
        });
      }
    });

    // Change language live when dropdown changes
    languageSelect.addEventListener("change", () => {
      if (overrideCheckbox.checked) {
        const selectedLang = languageSelect.value;
        chrome.storage.local.set({ langOverride: selectedLang }, () => {
          console.log("[Options] Language override set to:", selectedLang);
          // Re-apply translations immediately
          i18nReload();
        });
      }
    });

    // Helper to reload i18n translations
    function i18nReload() {
      if (typeof loadTranslations === "function") {
        loadTranslations();
      }
    }

});
