import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const API_KEY = 'AIzaSyCNKHwsuM-zhZm4vgfy5AKBwy4HwCyzan0';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function fetchCampusData() {
  try {
    const productsData = [];
    const lostData = [];

    const productsQuery = query(collection(db, 'products'), where('status', '==', 'active'));
    const productsSnap = await getDocs(productsQuery);
    productsSnap.forEach(doc => {
      const data = doc.data();
      productsData.push({
        id: doc.id,
        title: data.title,
        price: data.price,
        condition: data.condition || 'غير محدد',
        size: data.size || 'غير محدد',
      });
    });

    const lostQuery = query(collection(db, 'lostFound'));
    const lostSnap = await getDocs(lostQuery);
    lostSnap.forEach(doc => {
      const data = doc.data();
      lostData.push({
        id: doc.id,
        title: data.title,
        status: data.status || 'مفقود',
      });
    });

    return { products: productsData, lostItems: lostData };
  } catch (error) {
    console.error("Error fetching campus data for AI:", error);
    return { products: [], lostItems: [] };
  }
}

export async function askCampusAssistant(userMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const dbContext = await fetchCampusData();
    const contextString = JSON.stringify(dbContext, null, 2);

    const prompt = `
      أنت مساعد ذكي لتطبيق "Campus Market"، وهو تطبيق جامعي مصمم لمساعدة الطلاب على بيع وشراء الأدوات، واستعارة الكتب، وإيجاد المفقودات.
      
      فيما يلي البيانات الحالية المتوفرة في قاعدة بيانات التطبيق (بصيغة JSON):
      ${contextString}

      مهمتك:
      1. أجب على رسالة المستخدم بلغة عربية عامية بسيطة وودودة ومختصرة جداً.
      2. إذا كان المستخدم يبحث عن منتج (مثل بالطو، مسطرة، آلة حاسبة) أو شيء مفقود، ابحث بدقة في الـ JSON المرفق.
      3. إذا وجدت تطابقاً، أخبره أن المنتج متاح واذكر اسمه وسعره وحالته.
      4. إلزامي وإجباري: في كل مرة تعرض فيها منتجاً، يجب أن تكتب في نهاية الرد "رابط المنتج:" ثم تضع هذا الرابط: https://campus-market.app/search?q=TITLE (مع استبدال كلمة TITLE باسم المنتج الموجود في الـ JSON بدون مسافات استبدلها بـ %20).
      5. لا تقل أبداً أنك لا تستطيع إرسال روابط.
      6. إذا لم تجد المنتج، اعتذر بلطف.

      رسالة المستخدم: "${userMessage}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "عذراً، أواجه مشكلة في الاتصال حالياً. حاول مرة أخرى بعد قليل.";
  }
}
