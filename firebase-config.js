// firebase-config.js (place this in your project root, same level as package.json)
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7mLECACZJ9B4TvBTcRcZzE_OB94E4iOg",
  authDomain: "practice-5e0e0.firebaseapp.com",
  projectId: "practice-5e0e0",
  storageBucket: "practice-5e0e0.firebasestorage.app",
  databaseURL: "https://practice-5e0e0-default-rtdb.asia-southeast1.firebasedatabase.app",
  messagingSenderId: "732537143582",
  appId: "1:732537143582:web:e071db8db6d973ae89490f",
  measurementId: "G-XK9QJB14SN"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const database = getDatabase(app);
// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);



export default app;