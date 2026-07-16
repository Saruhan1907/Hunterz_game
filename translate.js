/* ==========================================================================
   GLOBALES ÜBERSETZUNGSSKRIPT (translate.js)
   ========================================================================== */

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
        
        if (!response.ok) {
            throw new Error(`Datei ${path} konnte nicht geladen werden (Status: ${response.status})`);
        }
        
        const translations = await response.json();
        
        // 1. Normale Text-Übersetzungen (Klassen mit data-i18n)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });

        // 2. Platzhalter-Übersetzungen (für Inputs, Textareas in Kontakt & Gästebuch)
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[key]) {
                el.setAttribute('placeholder', translations[key]);
            }
        });

        // Speichere die gewählte Sprache im Browser
        localStorage.setItem('lang', lang);
        
        // Flaggen-Bild im Hauptbutton der Navbar austauschen
        const langBtn = document.getElementById('languageBtn');
        if (langBtn) {
            langBtn.innerHTML = langFlags[lang] || lang.toUpperCase();
        }
        
        console.log("Sprache gewechselt zu:", lang);
        
    } catch (err) {
        console.error("DEBUG FEHLER:", err);
    }
}

// Initialisierung, wenn das DOM bereit ist
window.addEventListener('DOMContentLoaded', () => {
    // Event-Listener für die Dropdown-Items der Sprachauswahl registrieren
    document.querySelectorAll('#languageMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const selectedLang = e.currentTarget.getAttribute('data-lang');
            updateLanguage(selectedLang);
        });
    });

    // Gespeicherte Sprache laden (Standard: Deutsch)
    const savedLang = localStorage.getItem('lang') || 'de';
    updateLanguage(savedLang);
});