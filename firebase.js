    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";

    // The firebaseConfig object is now available globally thanks to the scripts in index.html
    // Make sure this script is loaded AFTER the firebase config script in your HTML.
    const app = initializeApp(window.firebaseConfig);

    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LesUq0rAAAAAEBTPhvr8oO4EY9tGUHbS9iAwj4A'),
      isTokenAutoRefreshEnabled: true
    });

    export const auth = getAuth(app);
    export const db = getFirestore(app);
    
