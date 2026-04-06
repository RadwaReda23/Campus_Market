// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ أضفنا Storage

const firebaseConfig = {
  apiKey: "AIzaSyCuEOI8MwpTxAv5LFAEgzxQ_j_vldY8j7Y",
  authDomain: "ecommerce-app-df76b.firebaseapp.com",
  projectId: "ecommerce-app-df76b",
  storageBucket: "ecommerce-app-df76b.appspot.com",
  messagingSenderId: "668442069375",
  appId: "1:668442069375:web:acf5aa861a3d769cc7b24a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ أضفنا السطر ده

export default app;