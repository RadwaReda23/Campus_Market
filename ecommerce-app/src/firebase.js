// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔹 إعدادات مشروعك (سيبيها زي ما هي)
const firebaseConfig = {
  apiKey: "AIzaSyCuEOI8MwpTxAv5LFAEgzxQ_j_vldY8j7Y",
  authDomain: "ecommerce-app-df76b.firebaseapp.com",
  projectId: "ecommerce-app-df76b",
  storageBucket: "ecommerce-app-df76b.appspot.com",
  messagingSenderId: "668442069375",
  appId: "1:668442069375:web:acf5aa861a3d769cc7b24a"
};

// 🔹 تشغيل Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Auth (لو هتستخدميه بعدين)
export const auth = getAuth(app);

// 🔹 Firestore (ده المهم لينا دلوقتي 🔥)
export const db = getFirestore(app);

// (اختياري)
export default app;