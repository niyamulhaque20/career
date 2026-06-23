import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
apiKey: "YOUR_API_KEY",
authDomain: "careeros-3d334.firebaseapp.com",
projectId: "careeros-3d334",
storageBucket: "careeros-3d334.firebasestorage.app",
messagingSenderId: "110278323056",
appId: "1:110278323056:web:f726fbd346ace2b06e7db5",
measurementId: "G-XPMVTTSN5V"
};

const app = initializeApp(firebaseConfig);

let analytics: ReturnType<typeof getAnalytics> | null = null;

try {
analytics = getAnalytics(app);
} catch {
analytics = null;
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
