import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from './firebase.js';
import { setupAuthentication, updateUserUI } from './auth.js';
import { setupFirestoreListeners, clearFirestoreListeners } from './firestore.js';
import { initializeUI, clearUIForSignOut } from './ui.js';

const initialLoader = document.getElementById('initial-loader');

// This listener will handle showing/hiding views and fetching data based on auth state.
// It no longer handles the initial UI setup.
onAuthStateChanged(auth, user => {
    initialLoader.classList.add('hidden');
    
    updateUserUI(user); // This is safe, it just toggles top-level views.

    if (user) {
        setupFirestoreListeners(user.uid);
    } else {
        clearFirestoreListeners();
        // We also clear the UI in case the user signs out after the page has loaded.
        clearUIForSignOut();
    }
});

// This is the correct place for all one-time UI setup.
// This event guarantees that the entire HTML document has been loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all UI elements and event listeners now that the page is ready.
    initializeUI(); 
    
    // Set up the Google Sign-In button.
    setupAuthentication(); 

    // If a user signs out and then reloads the page, we need to ensure
    // the UI is cleared correctly on load.
    if (!auth.currentUser) {
        clearUIForSignOut();
    }
});
