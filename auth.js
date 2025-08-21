import { GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from './firebase.js'; // Import the initialized auth service
import { showToast } from './notifications.js'; // Import the new toast function

const googleSignInBtn = document.getElementById('google-signin-btn');
const userInfo = document.getElementById('user-info');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');

const signIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
        console.error("Google Sign-In failed:", error);
        // Display a user-friendly error message
        showToast("Sign-in failed. Please try again.", "Authentication Error");
    });
};

const handleSignOut = () => {
    signOut(auth);
};

// This function only sets up the "Sign in with Google" button listener.
export const setupAuthentication = () => {
    googleSignInBtn.addEventListener('click', signIn);
};

// This function is called by the onAuthStateChanged listener in main.js
// to update the UI with the user's information.
export const updateUserUI = (user) => {
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        
        userInfo.innerHTML = `
            <img src="${user.photoURL}" alt="User Photo" class="w-6 h-6 rounded-full mr-2">
            <span class="flex-grow truncate font-semibold">${user.displayName}</span>
            <button id="sign-out-btn" class="ml-2 text-xs text-indigo-500 hover:underline">Sign Out</button>
        `;
        // We need to add the event listener every time this element is created.
        document.getElementById('sign-out-btn').addEventListener('click', handleSignOut);
    } else {
        appView.classList.add('hidden');
        loginView.classList.remove('hidden');
        userInfo.innerHTML = '';
    }
};
