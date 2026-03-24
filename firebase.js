import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgW5j_5pBEuLFHzVtRXKUfbpYDlB33EqI",
  authDomain: "chat-962fd.firebaseapp.com",
  projectId: "chat-962fd",
  storageBucket: "chat-962fd.firebasestorage.app",
  messagingSenderId: "276170670907",
  appId: "1:276170670907:web:425a09cd05f76d7c6d2d1e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firebaseDb = db;
window.firebaseFirestore = {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
};
