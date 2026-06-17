// What this file does: Initializes Firebase SDK and authentication providers
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDF8t55OHfeDii5eU7x62hL26IbwSJdbbM",
  authDomain:        "atlas-fa1ad.firebaseapp.com",
  projectId:         "atlas-fa1ad",
  storageBucket:     "atlas-fa1ad.firebasestorage.app",
  messagingSenderId: "447327273110",
  appId:             "1:447327273110:web:3b50d53de345a8a512c2b7",
  measurementId:     "G-Z0LRWB3JZ5",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Auth instance
export const auth = getAuth(app);
auth.languageCode = "en";

// Google provider — request email + profile scopes,
// force account chooser so users can pick/switch accounts
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({
  prompt: "select_account",   // always show account picker
});
