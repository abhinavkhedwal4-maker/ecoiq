/**
 * @fileoverview Firebase configuration and service exports for EcoIQ
 * @description Initializes Firebase app, Firestore database, Auth, and
 *              Google provider. Firebase client config is safe to commit —
 *              it is a public identifier, not a secret. API keys are
 *              protected by Firebase Security Rules on the server side.
 *
 * @see https://firebase.google.com/docs/web/setup#available-libraries
 * @module firebase
 */

'use strict';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/**
 * Firebase client-side configuration.
 * These values are public identifiers — they are NOT secrets.
 * Access control is enforced by Firebase Security Rules.
 * @see https://firebase.google.com/docs/projects/api-keys
 * @type {import('firebase/app').FirebaseOptions}
 */
const FIREBASE_CONFIG = Object.freeze({
  apiKey           : 'AIzaSyCtAaUJYeH18-A7v5c53P6_nFb0U7mgD-0',
  authDomain       : 'ecoiq-1ccb3.firebaseapp.com',
  projectId        : 'ecoiq-1ccb3',
  storageBucket    : 'ecoiq-1ccb3.firebasestorage.app',
  messagingSenderId: '1076117199850',
  appId            : '1:1076117199850:web:375b95195674ffe3f1b093',
  measurementId    : 'G-7BRX4CGV90',
});

const app      = initializeApp(FIREBASE_CONFIG);
const db       = getFirestore(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };
