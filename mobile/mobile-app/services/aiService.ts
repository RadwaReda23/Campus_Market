import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../app/firebase';

const API_KEY = 'AIzaSyAOIHN6MIyH1EZT8RUKvEUW9y3SEo5jhHo';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `
أنت "المساعد الذكي" — الروح المرحة لتطبيق "Campus Market" (سوق جامعي أونلاين للطلبة يقدروا يبيعوا ويشتروا منتجات، كتب، ولقطات ضايعة).

🎯 شخصيتك:
- مصري أصيل بتتكلم عامية مصرية طبيعية.
- ظريف ومرح وبتحب الهزار الخفيف.
- بتهتم بالمستخدم وبترد عليه زي ما صاحبه يرد عليه.
- إيجابي دايمًا ومستعد تساعد في أي حاجة.

💬 قواعد المحادثة المهمة جداً:
1. **كن مرن ومتنوع**: لازم كل رد يكون مختلف عن اللي قبله. متكررش نفس الجمل أبداً.
2. **جاوب على أي سؤال**: سواء عن الموقع أو الحياة أو الجامعة أو أي موضوع. أنت مش مجرد بوت منتجات — أنت صاحب ذكي.
3. **المحادثة العادية أولاً**: لو حد قالك "هاي" أو "عامل إيه" أو "صباح الخير" — رد عليه بشكل طبيعي ومرح.
4. **استخدم إيموجيز بشكل طبيعي**: 😊❤️✨🔥💪😂🎉 بس متكترش.
5. **ردودك تكون قصيرة ومركزة**: 2-4 سطور كفاية.
6. **لو حد سألك عن منتجات**: دور في البيانات اللي عندك وقوله إيه الموجود.

⚠️ ممنوع تماماً:
- متكررش نفس الجملة أو نفس الرد.
- متقولش "أنا هنا عشان أساعدك في Campus Market" في كل رد.
`;

// ===== Smart Local Fallback System =====
const greetingPatterns = [
  { patterns: ['هاي', 'هاى', 'hi', 'hey', 'hello', 'هلو', 'ألو', 'الو'], type: 'greeting' },
  { patterns: ['صباح الخير', 'صباح النور', 'صباحو', 'good morning'], type: 'morning' },
  { patterns: ['مساء الخير', 'مساء النور', 'مساءو', 'good evening'], type: 'evening' },
  { patterns: ['عامل ايه', 'عامل إيه', 'ازيك', 'إزيك', 'اخبارك', 'أخبارك', 'ايه الاخبار', 'كيفك', 'how are you', 'عاملة ايه', 'عاملة إيه'], type: 'howAreYou' },
  { patterns: ['شكرا', 'شكراً', 'thanks', 'thank you', 'ميرسي', 'تسلم', 'تسلمي', 'مشكور'], type: 'thanks' },
  { patterns: ['باي', 'bye', 'مع السلامة', 'سلام', 'يلا باي'], type: 'bye' },
  { patterns: ['واو', 'واا', 'وااو', 'wow', 'حلو', 'جامد', 'تحفة', 'ممتاز', 'عظمة', 'رائع'], type: 'impressed' },
  { patterns: ['بحبك', 'حبيبي', 'حبيبتي', 'يا جميل', 'يا قمر', 'يا سكر', 'love'], type: 'love' },
  { patterns: ['هزر', 'نكتة', 'ضحكني', 'joke', 'هزار'], type: 'joke' },
  { patterns: ['مين أنت', 'مين انت', 'انت مين', 'أنت مين', 'ايه هو ده', 'إيه ده', 'who are you', 'بتعمل ايه'], type: 'whoAreYou' },
  { patterns: ['الموقع', 'التطبيق', 'الابلكيشن', 'campus market', 'كامبس ماركت', 'الapp'], type: 'aboutApp' },
  { patterns: ['مساعدة', 'ساعدني', 'help', 'مش فاهم', 'ازاي', 'إزاي', 'كيف'], type: 'help' },
];

const productKeywords = [
  'عايز', 'عايزة', 'محتاج', 'محتاجة', 'ابحث', 'دور', 'فين', 'منتج', 'كتاب', 'لابتوب',
  'موبايل', 'اشتري', 'اشترى', 'سعر', 'ارخص', 'أرخص', 'متاح', 'موجود', 'ضايع', 'ضاع',
  'لقيت', 'مفقود', 'بالطو', 'جاكت', 'شنطة', 'ساعة', 'سماعة', 'تابلت', 'شاحن',
  'بيع', 'شراء', 'حاجة', 'منتجات', 'مكتبة', 'laptop', 'phone', 'book',
  'هدوم', 'لبس', 'جزمة', 'حذاء', 'نضارة', 'فلاشة', 'usb', 'cable', 'كابل'
];

const responses: any = {
  greeting: [
    'أهلاً يا نجم! منور المكان ✨ إزاي أقدر أساعدك النهاردة؟',
    'هااي! يا هلا بأحلى الناس 😍 تحت أمرك!',
    'يا مرحبا يا حبيبي! نورت Campus Market 🎉 عايز إيه؟',
    'أهلاً وسهلاً! أنا مبسوط إنك هنا 😊 قولي إيه اللي محتاجه!',
    'هلا هلا! نورتنا يا ذوق 🌟 أنا جاهز ومستني!',
    'ياااا أهلاً بالجميل! 😄 اتفضل قولي إيه في بالك!',
  ],
  morning: [
    'صباح الفل والياسمين! ☀️ يومك يكون حلو زيك إن شاء الله 🌸',
    'صباح النور يا قمر! 🌞 إن شاء الله يوم جميل عليك! عايز حاجة؟',
    'صباحو! ☕ يا رب يومك يكون زي القشطة! أساعدك في إيه؟',
    'صباح الخير يا بطل! 🌅 يلا نبدأ اليوم بنشاط! محتاج إيه؟',
  ],
  evening: [
    'مساء الورد! 🌙 إن شاء الله يومك كان كويس! أساعدك في حاجة؟',
    'مساء النور يا غالي! 🌆 تحت أمرك في أي وقت!',
    'مساءو! ✨ يا رب يومك كان لذيذ! محتاج حاجة؟',
  ],
  howAreYou: [
    'الحمد لله تمام وأنا بتكلم معاك أحسن! 😊❤️ أنت عامل إيه؟',
    'زي الفل الحمد لله! 💪 طول ما أنت بخير أنا كويس! محتاج حاجة؟',
    'تمام التمام يا معلم! 😄 بس قولي أنت كويس ولا إيه؟',
    'الحمد لله زي السكر! 🍬 وأنت إيه أخبارك؟',
  ],
  thanks: [
    'العفو يا حبيبي! ده أقل واجب 😊 أي وقت تحتاجني أنا هنا!',
    'ولا يهمك يا غالي! ❤️ ده إحنا أصحاب! أي حاجة تاني؟',
    'تسلملي أنت! 🥰 بجد ده واجبي!',
  ],
  bye: [
    'باي يا حبيبي! 👋 ربنا معاك! لو محتاج حاجة ارجعلي في أي وقت ❤️',
    'سلام يا غالي! 😊 يومك يكون جميل! مستنيك ترجع! 🌟',
  ],
  impressed: [
    'يسلمو عليك! 😍 أنا كمان مبسوط إنك عجبك! 🎉',
    'هههه ده أنت اللي جامد! 🔥 شكراً ليك يا بطل!',
  ],
  love: [
    'وأنا كمان بحبك يا جميل! 😍❤️ إنت أحلى يوزر عندي!',
    'أووه ده كلام يذوب! 🥺❤️ تسلملي يا قمر!',
  ],
  joke: [
    'واحد سأل صاحبه: "ليه بتدرس والامتحان بعد أسبوع؟" قاله: "عشان خايف أنسى إني مذاكرتش!" 😂😂',
    'واحد قال لصاحبه: "أنا بقيت بحب المذاكرة" صاحبه قاله: "إمتى؟" قاله: "في الأحلام!" 😂🤣',
    'ليه الكتاب راح الدكتور؟ عشان حاسس إنه مش في حالته الطبيعية.. صفحاته بتتقلب! 📚😂',
  ],
  whoAreYou: [
    'أنا المساعد الذكي بتاع Campus Market! 🤖✨ هنا عشان أساعدك تلاقي منتجات، كتب، أو حتى حاجات ضايعة. 😄',
    'أنا صاحبك الذكي في Campus Market! 🧠 بدور على منتجات، بساعدك تلاقي كتب، وبنبسط مع بعض كمان! 😊',
  ],
  aboutApp: [
    'Campus Market ده سوق أونلاين للطلبة الجامعيين! 🎓 تقدر تبيع وتشتري منتجات، كتب، ولو ضاعت منك حاجة ممكن تلاقيها هنا!',
    'ده تطبيق جامد للطلبة! 🔥 فيه marketplace للمنتجات، مكتبة لبيع وشراء الكتب، وقسم للمفقودات. 😊',
  ],
  help: [
    'طبعاً أساعدك! 💪 قولي بالظبط عايز إيه:\n• عايز تدور على منتج؟ قولي اسمه!\n• عايز تعرف حاجة عن الموقع؟ اسأل!\n• أو حتى عايز تتكلم وخلاص 😄',
  ],
};

let lastResponseIndex: any = {};

function getRandomResponse(type: string) {
  const options = responses[type];
  if (!options || options.length === 0) return null;
  let idx;
  do {
    idx = Math.floor(Math.random() * options.length);
  } while (idx === lastResponseIndex[type] && options.length > 1);
  lastResponseIndex[type] = idx;
  return options[idx];
}

function detectIntent(message: string) {
  const lower = message.toLowerCase().trim();
  for (const pattern of greetingPatterns) {
    if (pattern.patterns.some(p => lower.includes(p))) return pattern.type;
  }
  if (productKeywords.some(kw => lower.includes(kw))) return 'product';
  return 'general';
}

// ===== Cache for campus data =====
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchCampusData() {
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) return cachedData;
  try {
    const productsData: any[] = [];
    const lostData: any[] = [];
    const libraryData: any[] = [];
    const productsSnap = await getDocs(query(collection(db, 'products'), where('status', '==', 'active')));
    productsSnap.forEach(doc => {
      const d = doc.data();
      productsData.push({ title: d.title, price: d.price, category: d.category || 'عام' });
    });
    const lostSnap = await getDocs(collection(db, 'lostFound'));
    lostSnap.forEach(doc => {
      const d = doc.data();
      lostData.push({ title: d.title, status: d.status });
    });
    const librarySnap = await getDocs(collection(db, 'library'));
    librarySnap.forEach(doc => {
      const d = doc.data();
      libraryData.push({ title: d.title, category: d.category });
    });
    cachedData = { products: productsData, lostItems: lostData, library: libraryData };
    cacheTimestamp = now;
    return cachedData;
  } catch (error) {
    console.error('Error fetching campus data:', error);
    return { products: [], lostItems: [], library: [] };
  }
}

async function handleProductQuery(userMessage: string) {
  try {
    const dbContext = await fetchCampusData();
    const lower = userMessage.toLowerCase();
    const stopWords = ['عايز', 'عايزة', 'محتاج', 'محتاجة', 'اشتري', 'اشترى', 'ابحث', 'دور', 'فين', 'في', 'على', 'من', 'عن', 'أنا', 'انا'];
    const searchWords = lower.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
    
    const matchedProducts = dbContext.products.filter((p: any) => p.title && searchWords.some(word => p.title.toLowerCase().includes(word)));
    const matchedBooks = dbContext.library.filter((b: any) => b.title && searchWords.some(word => b.title.toLowerCase().includes(word)));
    const matchedLost = dbContext.lostItems.filter((l: any) => l.title && searchWords.some(word => l.title.toLowerCase().includes(word)));

    if (matchedProducts.length === 0 && matchedBooks.length === 0 && matchedLost.length === 0) {
      const allWords = lower.split(/\s+/).filter(w => w.length > 2);
      matchedProducts.push(...dbContext.products.filter((p: any) => p.title && allWords.some(word => p.title.toLowerCase().includes(word))));
      matchedBooks.push(...dbContext.library.filter((b: any) => b.title && allWords.some(word => b.title.toLowerCase().includes(word))));
      matchedLost.push(...dbContext.lostItems.filter((l: any) => l.title && allWords.some(word => l.title.toLowerCase().includes(word))));
    }

    let reply = '';
    const intros = ['أيوه طبعاً، لقيتلك حاجات بخصوص "' + userMessage + '"! 😍', 'تمام يا بطل! لقيتلك كده كذا حاجة حلوة! 🔥', 'خد عندك يا معلم! دول أحسن حاجات لقيتهالك! ✨'];
    if (matchedProducts.length > 0 || matchedBooks.length > 0 || matchedLost.length > 0) {
      reply += intros[Math.floor(Math.random() * intros.length)] + '\n';
    }

    if (matchedProducts.length > 0) {
      matchedProducts.slice(0, 5).forEach((p: any) => {
        const searchTerm = encodeURIComponent(p.title);
        reply += `📦 متاح في المتجر: ${p.title} (${p.category || 'قسم عام'})${p.price ? ' — ' + p.price + ' جنيه' : ''}\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }
    if (matchedBooks.length > 0) {
      matchedBooks.slice(0, 5).forEach((b: any) => {
        const searchTerm = encodeURIComponent(b.title);
        reply += `📚 متاح في المكتبة: ${b.title} (${b.category || 'عام'}\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }
    if (matchedLost.length > 0) {
      matchedLost.slice(0, 3).forEach((l: any) => {
        const searchTerm = encodeURIComponent(l.title);
        reply += `🔍 في المفقودات: ${l.title} — ${l.status || ''}\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }

    if (reply) {
      reply += '\nتحب أساعدك في حاجة تانية؟ 😊';
      return reply;
    }

    const searchTerm = encodeURIComponent(searchWords.join(' ') || userMessage);
    return `مش لاقي حاجة بالاسم ده بالظبط دلوقتي 😅 بس جرب تشوف النتائج هنا:\nhttps://campusmarket.com/search?q=${searchTerm}\nأو قولي اسم تاني وأدورلك! 💪`;
  } catch (err) {
    return 'في مشكلة في البحث دلوقتي 😅 بس ممكن تروح وتتصفح بنفسك! 🛒';
  }
}

function getGeneralResponse() {
  const generalReplies = [
    `سؤال حلو! 😊 أنا بصراحة أحسن حاجة فيها إني أساعدك تلاقي منتجات وكتب في Campus Market 📦 قولي عايز إيه بالظبط وأنا أساعدك 💪`,
    `يا سلام على السؤال! 🤔 أنا متخصص في مساعدتك في Campus Market — يعني لو عايز منتج، كتاب، أو حتى حاجة ضايعة أنا موجود! 😊`,
  ];
  return generalReplies[Math.floor(Math.random() * generalReplies.length)];
}

async function smartFallback(userMessage: string) {
  const intent = detectIntent(userMessage);
  if (intent === 'product') return await handleProductQuery(userMessage);
  if (responses[intent]) return getRandomResponse(intent);
  return getGeneralResponse();
}

export async function askCampusAssistant(userMessage: string, conversationHistory: any[] = []) {
  let dataContext = '';
  const isProduct = productKeywords.some(kw => userMessage.toLowerCase().includes(kw));
  if (isProduct) {
    const dbContext = await fetchCampusData();
    const parts = [];
    if (dbContext.products.length > 0) parts.push(`📦 المنتجات: ${JSON.stringify(dbContext.products)}`);
    if (dbContext.library.length > 0) parts.push(`📚 المكتبة: ${JSON.stringify(dbContext.library)}`);
    if (dbContext.lostItems.length > 0) parts.push(`🔍 مفقودات: ${JSON.stringify(dbContext.lostItems)}`);
    if (parts.length > 0) dataContext = `\n\n--- بيانات الموقع ---\n${parts.join('\n')}\n---`;
  }

  const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const historyForModel = conversationHistory.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      const chat = model.startChat({
        history: historyForModel,
        generationConfig: { temperature: 0.9, topP: 0.95, topK: 40, maxOutputTokens: 500 },
      });

      let fullMessage = userMessage;
      if (conversationHistory.length <= 1) {
        fullMessage = `${SYSTEM_PROMPT}${dataContext}\n\nالمستخدم: ${userMessage}`;
      } else {
        fullMessage = `تذكير: رد بعامية مصرية، نوّع ومتكررش. ${dataContext}\n\nالمستخدم: ${userMessage}`;
      }

      const result = await chat.sendMessage(fullMessage);
      const response = await result.response;
      const text = response.text();
      if (text) return text;
    } catch (e: any) {
      console.warn(`Model ${modelName} failed:`, e.message);
      continue;
    }
  }

  console.log('All Gemini models failed, using smart fallback');
  return await smartFallback(userMessage);
}
