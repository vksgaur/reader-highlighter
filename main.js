import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from './firebase.js'; // Import the initialized auth service
import { setupAuthentication, updateUserUI } from './auth.js';
import { setupFirestoreListeners, clearFirestoreListeners } from './firestore.js';
import { initializeUI, clearUIForSignOut } from './ui.js';

const initialLoader = document.getElementById('initial-loader');

// Central Authentication State Manager
onAuthStateChanged(auth, user => {
    initialLoader.classList.add('hidden'); // Hide loader once auth state is known
    
    if (user) {
        // MODIFIED: Initialize UI functions (including theme toggle) BEFORE showing the app view.
        // This prevents a race condition with styling.
        initializeUI(); 
        updateUserUI(user); // Now, show the main application view
        setupFirestoreListeners(user.uid);
    } else {
        // If the user is signed out, clear their data from the screen.
        updateUserUI(user); // Show the login screen
        clearFirestoreListeners();
        clearUIForSignOut();
    }
});

// Setup the initial UI elements and the sign-in button listener on page load.
document.addEventListener('DOMContentLoaded', () => {
    setupAuthentication(); 
});
