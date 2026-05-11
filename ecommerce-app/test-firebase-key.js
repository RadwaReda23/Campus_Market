const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyCuEOI8MwpTxAv5LFAEgzxQ_j_vldY8j7Y'; // Firebase key
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}

run();
