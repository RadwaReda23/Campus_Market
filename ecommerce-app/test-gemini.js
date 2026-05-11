const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyCNKHwsuM-zhZm4vgfy5AKBwy4HwCyzan0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}

run();
