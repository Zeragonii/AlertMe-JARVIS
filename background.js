let URL_TO_MONITOR = "";

// Load stored URL instead
// ⚠️ InfoSec might want to know: this URL is stored locally on the user's machine
chrome.storage.local.get({ monitorUrl: "" }, (data) => {
    URL_TO_MONITOR = data.monitorUrl || "";
    if (URL_TO_MONITOR) {
        console.log("[Config] Monitoring URL set to:", URL_TO_MONITOR);
    } else {
        console.warn("[Config] No monitorUrl configured yet.");
    }
});

const CHECK_INTERVAL_MINUTES = 1;

function applyKeepAwakeSetting() {
  // ⚠️ InfoSec might flag: requests system to stay awake, could affect power policies
  chrome.storage.local.get({ keepAwake: false }, (data) => {
    if (data.keepAwake) {
      chrome.power.requestKeepAwake("display");
      log("[TicketMonitor] KeepAwake enabled");
    } else {
      chrome.power.releaseKeepAwake();
      log("[TicketMonitor] KeepAwake disabled");
    }
  });
}

// Opens the options page as a popup window when clicking the toolbar icon
// ⚠️ InfoSec might flag: automatically opening windows could be seen as intrusive
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: "options.html",
    type: "popup",
    width: 480,
    height: 350,
    focused: true
  });
});

// Apply on startup / install
// ⚠️ InfoSec might want to check: this auto-runs monitoring and opens a page at install
chrome.runtime.onStartup.addListener(initMonitoring);
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage();
  initMonitoring();
});

// Re-apply whenever the keepAwake setting changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.keepAwake) {
    applyKeepAwakeSetting(); // ⚠️ keeps system awake based on user setting
  }
  // Update URL if changed
  if (area === "local" && changes.monitorUrl) {
    // ⚠️ InfoSec might ask: changing URL dynamically could allow monitoring arbitrary sites
    URL_TO_MONITOR = changes.monitorUrl.newValue || "";
    console.log("[Config] monitorUrl updated to:", URL_TO_MONITOR);
  }
});

// Timestamped logging wrapper
function getTimestamp() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `[${dd}:${mm}:${yyyy} - ${hh}:${min}]`;
}

function safeLog(...args) {
  try {
    console.log(getTimestamp(), ...args);
  } catch {
    console.log(...args); // fallback without timestamp
  }
}

function log(...args) {
    safeLog(...args);
}

function error(...args) {
    safeLog(...args);
}

// Spawns alert windows
// ⚠️ InfoSec might flag: creates popup windows and can play sounds, could be considered intrusive
function spawnAlert(type, currentValue, soundFile) {
    const typeLower = type.toLowerCase();

    let titleText = "";
    let bgColor = "";

    switch (typeLower) {
        case "danger":
            titleText = "🚨 New Trouble Ticket";
            bgColor = "#E60028";
            break;
        case "success":
            titleText = "✅ New Smart Hands";
            bgColor = "#28A745";
            break;
        case "warning":
            titleText = "⚠️ New Cross Connect";
            bgColor = "#FFD33D";
            break;
    }

    const alertURL = chrome.runtime.getURL(
        `alert.html?type=${typeLower}&title=${encodeURIComponent(titleText)}&color=${encodeURIComponent(bgColor)}&sound=${soundFile}&value=${currentValue}`
    );

    const width = 400;
    const height = 200;
    let left = 100;
    let top = 100;

    chrome.windows.create({
        url: alertURL,
        type: "popup",
        width,
        height,
        left,
        top
    });
}

// Main monitoring function
// ⚠️ InfoSec might ask: opens tabs and executes scripts on them; could be considered scraping or content injection
async function checkPage() {
    log("[TicketMonitor] Starting checkPage...");

    if (!URL_TO_MONITOR) {
        log("[TicketMonitor] No monitorUrl configured. Skipping check.");
        return;
    }

    try {
        let tab = await chrome.tabs.create({ url: URL_TO_MONITOR, active: false });
        log("[TicketMonitor] Tab opened, id:", tab.id);

        await new Promise((resolve) => {
            const listener = (tabId, changeInfo) => {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    log("[TicketMonitor] Tab load event fired, id:", tab.id);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });

        log("[TicketMonitor] Waiting 20s for page content...");
        await new Promise(r => setTimeout(r, 20000));

        let result = await new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    function getValue(containerClass) {
                        const container = document.querySelector("." + containerClass);
                        if (!container) return null;
                        const textField = container.querySelector(".mx-name-text2");
                        return textField ? textField.textContent.trim() : null;
                    }

                    return {
                        danger: getValue("danger-ticket"),
                        success: getValue("success-ticket"),
                        warning: getValue("warning-ticket")
                    };
                }
            }, (injectionResults) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(injectionResults[0]);
            });
        });

        const values = {
            danger: Number(result.result.danger),
            success: Number(result.result.success),
            warning: Number(result.result.warning)
        };

        log("[TicketMonitor] Current values:", values);

        chrome.storage.local.get({ danger: 0, success: 0, warning: 0 }, (data) => {
            log("[TicketMonitor] Last stored values:", data);

            if (values.danger > data.danger) {
                log("[TicketMonitor] Danger increased!");
                spawnAlert("danger", values.danger, "sounds/new-trouble-ticket.wav");
            }
            if (values.success > data.success) {
                log("[TicketMonitor] Success increased!");
                spawnAlert("success", values.success, "sounds/new-smart-hands.wav");
            }
            if (values.warning > data.warning) {
                log("[TicketMonitor] Warning increased!");
                spawnAlert("warning", values.warning, "sounds/new-cross-connect.wav");
            }

            // ⚠️ InfoSec might want to check: local storage of ticket counts
            chrome.storage.local.set(values, () => {
                log("[TicketMonitor] Stored new values:", values);
            });
        });

        chrome.tabs.remove(tab.id, () => {
            log("[TicketMonitor] Tab closed, id:", tab.id);
        });

    } catch (err) {
        error("[TicketMonitor] Error during checkPage:", err);
        chrome.notifications.create({
            title: "Ticket Monitor Error",
            message: err.message,
            type: "basic"
        });
    }
}

// ---------------- NEW MONITORING CONTROL ----------------
function initMonitoring() {
    applyKeepAwakeSetting();

    // 🔐 Require a valid URL before starting monitoring
    if (!URL_TO_MONITOR) {
        log("[TicketMonitor] Cannot start monitoring: no monitorUrl configured.");
        return;
    }

    chrome.storage.local.get({ monitorEnabled: false }, (data) => {
        if (data.monitorEnabled) {
            chrome.storage.local.get({ checkIntervalMinutes: CHECK_INTERVAL_MINUTES }, (syncData) => {
                const interval = Math.max(1, Number(syncData.checkIntervalMinutes));
                log("[TicketMonitor] Monitoring enabled on startup. Interval:", interval);
                checkPage(); // run immediately
                chrome.alarms.create("checkTickets", { periodInMinutes: interval });
            });
        } else {
            log("[TicketMonitor] Monitoring disabled on startup.");
            chrome.alarms.clear("checkTickets");
        }
    });
}

// React to user enabling/disabling monitoring
chrome.storage.onChanged.addListener((changes, area) => {
    if (changes.monitorEnabled && area === "local") {
        if (changes.monitorEnabled.newValue) {
            if (!URL_TO_MONITOR) {
                log("[TicketMonitor] Monitoring enable attempted, but no monitorUrl configured.");
                return;
            }
            log("[TicketMonitor] Monitoring enabled by user.");
            checkPage();
            chrome.storage.local.get({ checkIntervalMinutes: CHECK_INTERVAL_MINUTES }, (syncData) => {
                const interval = Math.max(1, Number(syncData.checkIntervalMinutes));
                chrome.alarms.create("checkTickets", { periodInMinutes: interval });
            });
        } else {
            log("[TicketMonitor] Monitoring disabled by user.");
            chrome.alarms.clear("checkTickets");
        }
    }
});

// Handle interval changes (only if monitoring is enabled AND URL set)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.checkIntervalMinutes) {
        chrome.storage.local.get({ monitorEnabled: false }, (data) => {
            if (data.monitorEnabled) {
                if (!URL_TO_MONITOR) {
                    log("[TicketMonitor] Interval changed, but no monitorUrl configured.");
                    return;
                }
                const newInterval = Math.max(1, Number(changes.checkIntervalMinutes.newValue));
                log("[TicketMonitor] Updating alarm to", newInterval, "minutes.");
                chrome.alarms.clear("checkTickets", () => {
                    chrome.alarms.create("checkTickets", { periodInMinutes: newInterval });
                });
            } else {
                log("[TicketMonitor] Interval changed but monitoring is disabled.");
            }
        });
    }
});

// Alarm triggers page check
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkTickets") {
        if (!URL_TO_MONITOR) {
            log("[TicketMonitor] Alarm triggered but no monitorUrl configured.");
            return;
        }
        log("[TicketMonitor] Alarm triggered:", alarm.name);
        checkPage();
    }
});
