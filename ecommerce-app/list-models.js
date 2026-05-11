const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = 'AIzaSyAOIHN6MIyH1EZT8RUKvEUW9y3SEo5jhHo';
const genAI = new GoogleGenerativeAI(API_KEY);
async function run() {
  try {
    const models = await genAI.listModels();
    console.log(JSON.stringify(models, null, 2));
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
run();
