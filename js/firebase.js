// ============================================
//   ECOIQ — Firebase Configuration
//   Safe to push — no secrets here
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCtAaUJYeH18-A7v5c53P6_nFb0U7mgD-0",
  authDomain:        "ecoiq-1ccb3.firebaseapp.com",
  projectId:         "ecoiq-1ccb3",
  storageBucket:     "ecoiq-1ccb3.firebasestorage.app",
  messagingSenderId: "1076117199850",
  appId:             "1:1076117199850:web:375b95195674ffe3f1b093",
  measurementId:     "G-7BRX4CGV90"
};

const app      = initializeApp(firebaseConfig);
const db       = getFirestore(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };