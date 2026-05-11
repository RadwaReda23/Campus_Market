import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCuEOI8MwpTxAv5LFAEgzxQ_j_vldY8j7Y",
  authDomain: "ecommerce-app-df76b.firebaseapp.com",
  projectId: "ecommerce-app-df76b",
  storageBucket: "ecommerce-app-df76b.appspot.com",
  messagingSenderId: "668442069375",
  appId: "1:668442069375:web:acf5aa861a3d769cc7b24a",
};

// تهيئة تطبيق Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// تهيئة Auth مع التخزين المحلي (يتعامل مع Web و Mobile بشكل مختلف)
let auth;
try {
  if (Platform.OS === 'web') {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  }
} catch (error) {
  // في حالة حدوث خطأ (مثل إعادة التهيئة)، نستخدم auth الحالية
  const { getAuth } = require("firebase/auth");
  auth = getAuth(app);
}

export { auth };

export const db = getFirestore(app);       // قاعدة البيانات (Firestore)
export const storage = getStorage(app);    // التخزين (Cloud Storage)

// مهم جدًا ل Expo Router
export default function Firebase() {
  return null;
}

/* 💡 إضافات/نصائح:
1. إذا هتستخدمي Cloudinary أو أي خدمة رفع صور، ممكن تسيبيها كخيار خارجي أو تدمجيه مع storage.
2. يمكن إضافة قواعد أمان في Firebase لضمان أن المستخدم يمكنه تعديل أو حذف المحتوى الخاص به فقط.
3. هذا الملف جاهز لدعم أي صفحة أو ميزة جديدة زي: 
   - Library / Products / Lost Items
   - Chat أو Messaging
   - أي مميزات مستقبلية
4. عند العمل على زر الحذف أو تعديل الحالة، تأكدي من صلاحيات Firestore لكل Collection.
*/