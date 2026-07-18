/* ==========================================================================
   GLOBALES ÜBERSETZUNGSSKRIPT (translate.js)
   ========================================================================== */
// Globale Variable, um die Übersetzungen zu speichern
let currentTranslations = {};

// Die Funktion, die dashboard.js benutzen wird
window.t = function(key) {
    return currentTranslations[key] || key; // Gibt Übersetzung zurück oder den Key, falls nicht gefunden
};
// Flaggen-HTML für den Sprach-Button
const langFlags = {
    de: '<img src="https://flagcdn.com/w20/de.png" alt="DE" style="width: 20px; height: auto; border-radius: 2px;"> DE',
    en: '<img src="https://flagcdn.com/w20/gb.png" alt="EN" style="width: 20px; height: auto; border-radius: 2px;"> EN',
    tr: '<img src="https://flagcdn.com/w20/tr.png" alt="TR" style="width: 20px; height: auto; border-radius: 2px;"> TR'
};

// Hauptfunktion zum Laden und Setzen der Sprache
async function updateLanguage(lang) {
    const path = `${lang}.json`; 
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error("Datei konnte nicht geladen werden");
        
        currentTranslations = await response.json();
        
        // DOM aktualisieren
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (currentTranslations[key]) el.textContent = currentTranslations[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (currentTranslations[key]) el.setAttribute('placeholder', currentTranslations[key]);
        });

        localStorage.setItem('lang', lang);
        const langBtn = document.getElementById('languageBtn');
        if (langBtn) langBtn.innerHTML = langFlags[lang] || lang.toUpperCase();

        // SIGNAL: Übersetzungen sind fertig!
        window.dispatchEvent(new CustomEvent('translationsLoaded'));
        
    } catch (err) {
        console.error("DEBUG FEHLER:", err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#languageMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            updateLanguage(e.currentTarget.getAttribute('data-lang'));
        });
    });
    const savedLang = localStorage.getItem('lang') || 'de';
    updateLanguage(savedLang);
});