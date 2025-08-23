    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    // App Check has been temporarily removed to resolve the configuration error.
    // import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";
    import { firebaseConfig } from './firebase-config.js'; // Re-import your local config

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    /*
    // Temporarily commented out to fix the 400 error.
    // Please re-enable this after configuring your reCAPTCHA key in the Google Cloud Console
    // with the correct authorized domains for your project.
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LesUq0rAAAAAEBTPhvr8oO4EY9tGUHbS9iAwj4A'),
      isTokenAutoRefreshEnabled: true
    });
    */

    // Initialize and export Firebase services
    export const auth = getAuth(app);
    export const db = getFirestore(app);

