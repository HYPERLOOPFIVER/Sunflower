import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    query, 
    where, 
    orderBy ,serverTimestamp 
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsjPu0kt8ilUMK9QDu9TobEzTMMkbhiQg",
  authDomain: "certano-97049.firebaseapp.com",
  
  projectId: "certano-97049",
  storageBucket: "certano-97049.appspot.com",
  messagingSenderId: "713775491750",
  appId: "1:713775491750:web:6a2684643503e60ea6a267"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Export all required functions properly
export { 
    auth, 
    db, 
    onAuthStateChanged, 
    addDoc, 
    collection, 
    app, 
    getFirestore, 
    deleteDoc,  // 🔥 Added this to fix the error
    getDocs, 
    query, 
    where, 
    orderBy ,serverTimestamp 
};
