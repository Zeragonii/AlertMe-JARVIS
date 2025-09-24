// --- Helpers ---

// Safe logging wrapper to include timestamp. InfoSec note: logs could potentially contain sensitive ticket info; be mindful if logs are shared externally.
function safeLog(...args) {
    try {
        console.log(new Date().toLocaleTimeString(), ...args);
    } catch {
        console.log(...args);
    }
}

// Plays audio alerts. InfoSec note: playing local files via chrome.runtime.getURL is safe, but ensure no external untrusted sources are loaded here.
function playSound(file) {
    if (!file) return;

    const audio = new Audio(chrome.runtime.getURL(file));
    audio.volume = 0.7;

    audio.play()
        .then(() => safeLog("[Alert] Playing sound:", file))
        .catch(err => {
            safeLog("[Alert] Audio play blocked or failed:", err);

            // Retry once after 1 second
            setTimeout(() => {
                audio.play().catch(err2 => {
                    safeLog("[Alert] Retry failed too:", err2);
                });
            }, 1000);
        });

    // Event when audio is fully buffered
    audio.oncanplaythrough = () => {
        safeLog("[Alert] Audio can play through:", file);
    };

    // Event on audio error
    audio.onerror = (e) => {
        // InfoSec note: errors may leak file names; ensure logs are internal only.
        safeLog("[Alert] Audio error:", e, "File:", file);
    };
}

// --- Get query parameters ---
// InfoSec note: query parameters are user-supplied via the URL, which could be manipulated. Ensure no sensitive data is passed here.
const params = new URLSearchParams(window.location.search);
const type = params.get("type");
const value = params.get("value");
const file = params.get("sound"); // name of the audio file

// --- Get DOM elements ---
const titleEl = document.getElementById("title");
const detailsEl = document.getElementById("details");
const bodyEl = document.getElementById("alertBody");

// --- Determine style + text based on type ---
let bgColor = "#333";
let titleText = t("alert.title");

switch (type?.toLowerCase()) {
    case "danger":
        bgColor = "#E60028";
        titleText = t("alert.danger");
        break;
    case "success":
        bgColor = "#28A745";
        titleText = t("alert.success");
        break;
    case "warning":
        bgColor = "#FFD33D";
        titleText = t("alert.warning");
        break;
}

// --- Apply styles and text ---
// InfoSec note: DOM manipulation is local, but always be aware of XSS if any content were dynamic or external.
bodyEl.style.backgroundColor = bgColor;
titleEl.textContent = titleText;
detailsEl.textContent = `Current Ticket Count: ${value}`;

// --- Play audio if enabled in options ---
// InfoSec note: user preference controls whether sound plays; no sensitive data leaves the extension.
chrome.storage.local.get({ enableSound: false }, (data) => {
    if (!data.enableSound) return; // Exit if sound is disabled
    playSound(file);
});
