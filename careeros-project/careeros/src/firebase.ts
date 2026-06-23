// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Read Firebase config from Vite environment variables (VITE_ prefix)
const V = (import.meta.env as any) || {};
const firebaseConfig = {
  apiKey: V.VITE_FIREBASE_API_KEY,
  authDomain: V.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: V.VITE_FIREBASE_PROJECT_ID,
  storageBucket: V.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: V.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: V.VITE_FIREBASE_APP_ID,
  measurementId: V.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  // analytics may not be available in some environments
  analytics = getAnalytics(app);
} catch (e) {
  analytics = null;
}
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
