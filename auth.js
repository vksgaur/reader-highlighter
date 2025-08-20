import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeApp } from './main.js';

const auth = getAuth();
const provider = new GoogleAuthProvider();

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const googleSignInBtn = document.getElementById('google-signin-btn');
const userInfo = document.getElementById('user-info');

const signIn = () => {
    signInWithPopup(auth, provider).catch(error => {
        console.error("Google Sign-In failed:", error);
    });
};

const signOutUser = () => {
    signOut(auth);
};

export const setupAuthentication = () => {
    googleSignInBtn.addEventListener('click', signIn);

    onAuthStateChanged(auth, user => {
        if (user) {
            loginView.classList.add('hidden');
            appView.classList.remove('hidden');
            
            userInfo.innerHTML = `
                <img src="${user.photoURL}" alt="User Photo" class="w-6 h-6 rounded-full mr-2">
                <span class="flex-grow truncate font-semibold">${user.displayName}</span>
                <button id="sign-out-btn" class="ml-2 text-xs text-indigo-500 hover:underline">Sign Out</button>
            `;
            document.getElementById('sign-out-btn').addEventListener('click', signOutUser);

            initializeApp(user);
        } else {
            appView.classList.add('hidden');
            loginView.classList.remove('hidden');
            
            userInfo.innerHTML = 'Not signed in.';
            // Potentially clear UI state here if needed
        }
    });
};
