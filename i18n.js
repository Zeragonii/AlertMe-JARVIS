const translations = {
  en: {
    "alert.title": "New Ticket",
    "alert.danger": "🚨 New Trouble Ticket",
    "alert.success": "✅ New Smart Hands",
    "alert.warning": "⚠️ New Cross Connect",

    "options.heading": "AlertMe JARVIS Settings",
    "options.urlLabel": "URL to Monitor:",
    "options.urlPlaceholder": "Enter URL",
    "options.enableMonitoring": "Enable Monitoring",
    "options.keepAwake": "Keep screen awake",
    "options.enableSound": "Enable sound alerts",
    "options.checkInterval": "Check Interval (minutes):"
  },
  fr: {
    "alert.title": "Nouveau Ticket",
    "alert.danger": "🚨 Nouveau Ticket Problème",
    "alert.success": "✅ Nouvelle Intervention Smart Hands",
    "alert.warning": "⚠️ Nouvelle Connexion Croisée",

    "options.heading": "Paramètres AlertMe JARVIS",
    "options.urlLabel": "URL à surveiller :",
    "options.urlPlaceholder": "Entrez l’URL",
    "options.enableMonitoring": "Activer la surveillance",
    "options.keepAwake": "Garder l’écran allumé",
    "options.enableSound": "Activer les alertes sonores",
    "options.checkInterval": "Intervalle de vérification (minutes) :"
  }
};

// Detect browser language
const userLang = navigator.language.slice(0, 2);
const lang = translations[userLang] ? userLang : "en";

// Apply translations
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });
});

// Helper for JS (so alert.js can grab translated strings)
function t(key) {
  return translations[lang][key] || key;
}
