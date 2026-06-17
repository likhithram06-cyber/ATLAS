// What this file does: Initializes Firebase SDK and authentication providers
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDF8t55OHfeDii5eU7x62hL26IbwSJdbbM",
  authDomain: "atlas-fa1ad.firebaseapp.com",
  projectId: "atlas-fa1ad",
  storageBucket: "atlas-fa1ad.firebasestorage.app",
  messagingSenderId: "447327273110",
  appId: "1:447327273110:web:3b50d53de345a8a512c2b7",
  measurementId: "G-Z0LRWB3JZ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Apply custom language (optional, e.g. 'en')
auth.languageCode = 'en';
