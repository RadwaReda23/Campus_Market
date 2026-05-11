const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = 'AIzaSyAOIHN6MIyH1EZT8RUKvEUW9y3SEo5jhHo';
const genAI = new GoogleGenerativeAI(API_KEY);

async function debugAI() {
  const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-flash-8b"];
  console.log("--- STARTING AI DIAGNOSTIC ---");
  
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Respond with only the word SUCCESS");
      const text = result.response.text();
      console.log(`Result for ${m}: ${text}`);
    } catch (e) {
      console.error(`Error for ${m}:`, e.message);
      if (e.response) console.error("Full Response Error:", JSON.stringify(e.response, null, 2));
    }
  }
  console.log("--- DIAGNOSTIC COMPLETE ---");
}

debugAI();
