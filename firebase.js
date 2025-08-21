import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// 1. Import the App Check module
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize App Check
// I've replaced the placeholder with your actual Site Key.
// Make sure to copy your key here if this is not correct.
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LesUq0rAAAAAEBTPhvr8oO4EY9tGUHbS9iAwj4A'),

  // Optional argument. If true, the SDK automatically refreshes App Check
  // tokens as needed.
  isTokenAutoRefreshEnabled: true
});


// Initialize and export Firebase services. Any module that imports these
// is guaranteed to get an initialized instance.
export const auth = getAuth(app);
export const db = getFirestore(app);
