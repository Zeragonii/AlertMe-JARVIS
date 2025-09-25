// Define supported languages
const supportedLangs = [
  "en",    // English
  "es",    // Spanish
  "pt-BR", // Portuguese - Brazil
  "pt-PT", // Portuguese - Portugal
  "fr",    // French
  "zh-Hans", // Simplified Chinese (China)
  "zh-Hant", // Traditional Chinese (Hong Kong)
  "ja",    // Japanese
  "ko",    // Korean
  "de",    // German
  "it",    // Italian
  "nl",    // Dutch
  "id",    // Indonesian
  "ar",    // Arabic
  "ms",    // Malaysian
  "pl",    // Polish
  "sv",    // Swedish
  "fi",    // Finnish
  "tr",    // Turkish
  "hi"     // Hindi
];
const defaultLang = "en";

let translations = {};
let lang = defaultLang;

/**
 * Detects the user's preferred language and matches it against supportedLangs.
 * Handles region codes and Chinese variants.
 * Uses chrome.storage.local for override (instead of localStorage).
 */
function detectLanguage(callback) {
  chrome.storage.local.get({ langOverride: null }, (data) => {
    const override = data.langOverride;
    if (override && supportedLangs.includes(override)) {
      callback(override);
      return;
    }

    const rawLang = navigator.language || navigator.userLanguage || defaultLang;
    const tag = rawLang.replace("_", "-");

    if (tag.startsWith("zh")) {
      callback(/-?(tw|hk|hant|mo)$/i.test(tag) ? "zh-Hant" : "zh-Hans");
      return;
    }

    if (supportedLangs.includes(tag)) {
      callback(tag);
      return;
    }

    const base = tag.split("-")[0];
    if (supportedLangs.includes(base)) {
      callback(base);
      return;
    }

    callback(defaultLang);
  });
}

/**
 * Loads the translation JSON for the detected language and applies it
 */
function loadTranslations() {
  return new Promise((resolve) => {
    detectLanguage((detectedLang) => {
      lang = detectedLang;
      fetch(`/lang/${lang}.json`)
        .then(res => res.json())
        .then(data => {
          translations = data;
          applyTranslations();
          resolve(translations); // resolve with translations
        })
        .catch(err => {
          console.error("Failed to load translations:", err);
          resolve({});
        });
    });
  });
}

/**
 * Applies translations to elements with data-i18n or data-i18n-placeholder attributes
 */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const text = getNested(translations, key);
    if (text) el.textContent = text;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = getNested(translations, key);
    if (text) el.placeholder = text;
  });
}

/**
 * Helper to fetch nested keys like "alert.title"
 */
function getNested(obj, path) {
  return path.split(".").reduce((o, p) => (o ? o[p] : null), obj);
}

/**
 * Helper function for JS code to get translated strings
 */
function t(key) {
  return getNested(translations, key) || key;
}

// Load translations when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadTranslations();
});
