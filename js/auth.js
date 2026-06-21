/**
 * @fileoverview Google Authentication module for EcoIQ
 * @description Wraps Firebase Auth — sign-in, sign-out, and state listener.
 *              All auth state changes are funnelled through initAuth so callers
 *              never depend on Firebase internals directly.
 * @module auth
 */

'use strict';

import { auth, provider } from './firebase.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/**
 * Registers authentication state callbacks and begins listening for changes.
 * The onLogin callback is invoked immediately if a session already exists.
 *
 * @param {function(import('firebase/auth').User): void} onLogin  - Called with the User when signed in
 * @param {function(): void}                             onLogout - Called when signed out
 * @returns {function(): void} Unsubscribe function — call to stop listening
 */
export function initAuth(onLogin, onLogout) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

/**
 * Opens a Google sign-in popup and returns the authenticated user.
 *
 * @returns {Promise<import('firebase/auth').User>} Authenticated Firebase user
 * @throws {Error} Re-throws Firebase auth errors for the caller to handle
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('[Auth] Sign-in failed:', err.code, err.message);
    throw err;
  }
}

/**
 * Signs the current user out.
 *
 * @returns {Promise<void>}
 * @throws {Error} Re-throws Firebase auth errors for the caller to handle
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[Auth] Sign-out failed:', err.code, err.message);
    throw err;
  }
}

/**
 * Returns the currently authenticated user, or null if signed out.
 *
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}
