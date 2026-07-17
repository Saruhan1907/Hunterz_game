// guestbook.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Deine Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyC1XrxNU_W5Qib3Lk840IXMWJQE1-69P4M",
  authDomain: "devz-guestbook.firebaseapp.com",
  projectId: "devz-guestbook",
  storageBucket: "devz-guestbook.firebasestorage.app",
  messagingSenderId: "436656643800",
  appId: "1:436656643800:web:4778ae36504fb3b0401ad",
  measurementId: "G-RLMJL2X96"
};

// Firebase & Firestore initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase erfolgreich verbunden!");

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
        guestbookEntries.innerHTML = ""; // Löscht die Mock-Einträge, sobald Daten da sind
        
        if (snapshot.empty) {
            guestbookEntries.innerHTML = `<p class="text-white-50 text-center py-4" data-i18n="guestbook-no-entries">Noch keine Einträge vorhanden. Sei der Erste!</p>`;
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