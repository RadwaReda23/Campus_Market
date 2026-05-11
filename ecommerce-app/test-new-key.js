const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = 'AIzaSyBH29UIaoOccD81JQIMC6l1RM6kZAFigbc';
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  try {
    console.log("Testing gemini-2.0-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("قولي 'أنا شغال يا معلم!' بالعامية المصرية");
    console.log("✅ SUCCESS:", result.response.text());
  } catch (e) {
    console.error("❌ FAILED:", e.message);
  }
}
test();
