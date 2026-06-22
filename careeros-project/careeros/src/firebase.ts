// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSl2wed9ibYVPC_u78JRxrvcaT6jU-uC0",
  authDomain: "careeros-3d334.firebaseapp.com",
  projectId: "careeros-3d334",
  storageBucket: "careeros-3d334.firebasestorage.app",
  messagingSenderId: "110278323056",
  appId: "1:110278323056:web:f726fbd346ace2b06e7db5",
  measurementId: "G-XPMVTTSN5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
