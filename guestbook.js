// guestbook.js
import { db } from './firebase-config.js'; // Hier laden wir die Verbindung zentral
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// --------------------------------------------------------------------------
// GÄSTEBUCH LOGIK (Einträge speichern & laden)
// --------------------------------------------------------------------------

// 1. Elemente aus deinem HTML greifen
const guestbookForm = document.getElementById('guestbookForm');
const guestbookEntries = document.getElementById('guestbookEntries');

// 2. Neuen Eintrag in Firebase speichern
if (guestbookForm) {
    guestbookForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Verhindert das Neuladen der Seite
        
        // HIER SIND DIE KORRIGIERTEN IDs AUS DEINEM HTML (gbName & gbMessage)
        const nameInput = document.getElementById('gbName');
        const messageInput = document.getElementById('gbMessage');
        
        if (!nameInput || !messageInput) {
            console.error("Eingabefelder wurden im HTML nicht gefunden!");
            return;
        }

        try {
            // Eintrag in die Firestore-Collection "entries" schreiben
            await addDoc(collection(db, "entries"), {
                name: nameInput.value.trim(),
                message: messageInput.value.trim(),
                timestamp: serverTimestamp() // Generiert die Serverzeit
            });
            
            // Formular nach dem Absenden leeren
            guestbookForm.reset();
            console.log("Eintrag erfolgreich gespeichert!");
            
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
        }
    });
}

// 3. Einträge in Echtzeit aus Firebase laden und anzeigen
if (guestbookEntries) {
    // Abfrage: Sortiere die Einträge nach Zeit (neueste zuerst)
    const q = query(collection(db, "entries"), orderBy("timestamp", "desc"));
    
    // onSnapshot lauscht live auf Änderungen in der Datenbank
    onSnapshot(q, (snapshot) => {
        guestbookEntries.innerHTML = ""; // Löscht alte Einträge/Platzhalter, sobald Daten da sind
        
        if (snapshot.empty) {
            // Passt jetzt exakt zum HTML-Platzhalter (Farbe & Struktur ohne Icon)
            guestbookEntries.innerHTML = `
                <div class="text-center py-4">
                    <p class="mb-0 small" style="color: rgba(255, 255, 255, 0.6);" data-i18n="guestbook-no-entries">Noch keine Einträge vorhanden. Sei der Erste!</p>
                </div>
            `;
            
            // Falls deine Übersetzungsfunktion auf der Seite existiert, rufen wir sie hier auf:
            if (typeof updateContent === 'function') {
                updateContent();
            }
            return;
        }
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Ein schickes Kärtchen für jeden Eintrag erstellen
            const entryCard = document.createElement('div');
            entryCard.className = "p-3 rounded border border-secondary mb-3";
            entryCard.style.background = "rgba(255,255,255,0.02)";
            
            // Datum formatieren
            let formattedDate = "Gerade eben...";
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                formattedDate = date.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            entryCard.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong class="text-accent">${escapeHTML(data.name)}</strong>
                    <span class="text-accent small">${formattedDate}</span>
                </div>
                <p class="mb-0 small text-light" style="white-space: pre-wrap;">${escapeHTML(data.message)}</p>
            `;
            
            guestbookEntries.appendChild(entryCard);
        });
    });
}

// Sicherheitsfunktion gegen XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}