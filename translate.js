/* ==========================================================================
   GLOBALES ÜBERSETZUNGSSKRIPT (translate.js)
   ========================================================================== */
let currentTranslations = {};

window.t = function(key) {
    return currentTranslations[key] || key;
};

const langFlags = {
    de: '<div class="d-flex align-items-center gap-2"><img src="https://flagcdn.com/w20/de.png" alt="DE" style="width: 20px; height: auto; border-radius: 2px;"> <span>DE</span></div>',
    en: '<div class="d-flex align-items-center gap-2"><img src="https://flagcdn.com/w20/gb.png" alt="EN" style="width: 20px; height: auto; border-radius: 2px;"> <span>EN</span></div>',
    tr: '<div class="d-flex align-items-center gap-2"><img src="https://flagcdn.com/w20/tr.png" alt="TR" style="width: 20px; height: auto; border-radius: 2px;"> <span>TR</span></div>'
};

async function updateLanguage(lang) {
    const path = `${lang}.json`; 
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error("Datei konnte nicht geladen werden");
        
        currentTranslations = await response.json();
        
        // Texte aktualisieren
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (currentTranslations[key]) el.innerHTML = currentTranslations[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (currentTranslations[key]) el.setAttribute('placeholder', currentTranslations[key]);
        });

        localStorage.setItem('lang', lang);

        const langBtn = document.getElementById('languageBtn');
        if (langBtn) langBtn.innerHTML = langFlags[lang] || lang.toUpperCase();

        window.dispatchEvent(new CustomEvent('translationsLoaded'));
        
        // Badges Popovers erneuern
        updateBadgesPopovers();

    } catch (err) {
        console.error("DEBUG FEHLER:", err);
    }
}

// Popovers für Badges
function updateBadgesPopovers() {
    document.querySelectorAll('.skill-badge').forEach(badge => {
        const existingPopover = bootstrap.Popover.getInstance(badge);
        if (existingPopover) existingPopover.dispose();

        const key = badge.getAttribute('data-badge');
        const fullKey = `badge-${key}`;

        new bootstrap.Popover(badge, {
            content: function() {
                return currentTranslations[fullKey] || badge.innerText;
            },
            trigger: 'focus',
            placement: 'top',
            container: 'body'
        });
    });
}

// Bootstrap Components initialisieren & Event-Listener setzen
window.addEventListener('DOMContentLoaded', () => {
    // Klick-Events für Sprachwechsel
    document.querySelectorAll('#languageMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = e.currentTarget.getAttribute('data-lang');
            if (selectedLang) updateLanguage(selectedLang);
        });
    });

    const savedLang = localStorage.getItem('lang') || 'de';
    updateLanguage(savedLang);
});