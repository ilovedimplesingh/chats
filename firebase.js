// 🔥 IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 YOUR CONFIG (PASTE YOURS HERE)
const firebaseConfig = {
  apiKey: "AIzaSyDgW5j_5pBEuLFHzVtRXKUfbpYDlB33EqI",
  authDomain: "chat-962fd.firebaseapp.com",
  projectId: "chat-962fd",
  storageBucket: "chat-962fd.firebasestorage.app",
  messagingSenderId: "276170670907",
  appId: "1:276170670907:web:425a09cd05f76d7c6d2d1e"
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// make global
window.db = db;
