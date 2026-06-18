// ============================================
//   ECOIQ — Google Authentication
// ============================================

import { auth, provider } from './firebase.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export function initAuth(onLogin, onLogout) {
  onAuthStateChanged(auth, user => {
    if (user) {
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
    throw err;
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}