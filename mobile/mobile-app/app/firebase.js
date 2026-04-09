import { getStorage } from "firebase/storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCuEOI8MwpTxAv5LFAEgzxQ_j_vldY8j7Y",
  authDomain: "ecommerce-app-df76b.firebaseapp.com",
  projectId: "ecommerce-app-df76b",
  storageBucket: "ecommerce-app-df76b.appspot.com",
  messagingSenderId: "668442069375",
  appId: "1:668442069375:web:acf5aa861a3d769cc7b24a",
};

// تهيئة تطبيق Firebase (لو مفيش تطبيقات موجودة مسبقًا)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// تصدير خدمات Firebase
export const auth = getAuth(app);          // المصادقة (Authentication)
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