import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from './firebase.js'; // Import the initialized auth service
import { setupAuthentication, updateUserUI } from './auth.js';
import { setupFirestoreListeners, clearFirestoreListeners } from './firestore.js';
import { initializeUI, clearUIForSignOut } from './ui.js';

const initialLoader = document.getElementById('initial-loader');

// Central Authentication State Manager
// This is the core logic that responds to user sign-in or sign-out.
onAuthStateChanged(auth, user => {
    initialLoader.classList.add('hidden'); // Hide loader once auth state is known
    updateUserUI(user); // Update the user info display (e.g., name, photo)
    if (user) {
        // If the user is signed in, set up the database listeners for their data.
        initializeUI();
        setupFirestoreListeners(user.uid);
    } else {
        // If the user is signed out, clear their data from the screen.
        clearFirestoreListeners();
        clearUIForSignOut();
    }
});

// Setup the initial UI elements and the sign-in button listener on page load.
document.addEventListener('DOMContentLoaded', () => {
    setupAuthentication(); 
});
