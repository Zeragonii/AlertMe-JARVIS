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
 */
function detectLanguage() {
  const override = localStorage.getItem("langOverride");
  if (override && supportedLangs.includes(override)) return override;

  const rawLang = navigator.language || navigator.userLanguage || defaultLang;
  const tag = rawLang.replace("_", "-");

  if (tag.startsWith("zh")) {
    if (/-?(tw|hk|hant|mo)$/i.test(tag)) return "zh-Hant";
    return "zh-Hans";
  }

  if (supportedLangs.includes(tag)) return tag;

  const base = tag.split("-")[0];
  if (supportedLangs.includes(base)) return base;

  return defaultLang;
}

/**
 * Loads the translation JSON for the detected language and applies it
 */
function loadTranslations() {
  lang = detectLanguage();
  return fetch(`/lang/${lang}.json`)
    .then(res => res.json())
    .then(data => {
      translations = data;
      applyTranslations();
      return translations; // resolve with translations
    })
    .catch(err => {
      console.error("Failed to load translations:", err);
      return {};
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
