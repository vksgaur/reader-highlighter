import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { firebaseConfig } from './firebase-config.js';
import { setupAuthentication } from './auth.js';
import { setupFirestoreListeners } from './firestore.js';
import { initializeUI } from './ui.js';

// Initialize Firebase
const app = initializeFirebaseApp(firebaseConfig);

// This function is called by auth.js once the user is logged in
export const initializeApp = (user) => {
    setupFirestoreListeners(user.uid);
};

// Setup the UI and Authentication listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupAuthentication();
});
