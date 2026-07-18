// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1XrxNU_W5Qib3Lk840IXMWJQE1-69P4M",
  authDomain: "devz-guestbook.firebaseapp.com",
  projectId: "devz-guestbook",
  storageBucket: "devz-guestbook.firebasestorage.app",
  messagingSenderId: "436656643800",
  appId: "1:436656643800:web:4778ae36504fb3b0401ad",
  measurementId: "G-RLMJL2X96"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // WICHTIG: Hier exportieren wir 'db'