// Direct REST API call - bypasses SDK completely
async function testDirect() {
  const API_KEY = 'AIzaSyBH29UIaoOccD81JQIMC6l1RM6kZAFigbc';
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash-preview-04-17', 'gemini-2.0-flash-lite'];
  
  for (const model of models) {
    try {
      console.log(`Testing ${model} via REST...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "قول كلمة واحدة: نجاح" }] }]
        })
      });
      const data = await res.json();
      if (data.candidates) {
        console.log(`✅ ${model} WORKS:`, data.candidates[0].content.parts[0].text);
        return;
      } else {
        console.log(`❌ ${model}:`, JSON.stringify(data.error?.message || data).substring(0, 200));
      }
    } catch (e) {
      console.error(`❌ ${model} Error:`, e.message);
    }
  }
}
testDirect();
