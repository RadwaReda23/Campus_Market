import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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
// This handles conversation when Gemini API is unavailable

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

const responses = {
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
    'ماشي الحال والحمد لله! 😊 المهم أنت عامل إيه ومحتاج إيه؟',
    'بخير وعلى أحسن حال! ❤️ قولي إيه اللي عندك!',
  ],
  thanks: [
    'العفو يا حبيبي! ده أقل واجب 😊 أي وقت تحتاجني أنا هنا!',
    'ولا يهمك يا غالي! ❤️ ده إحنا أصحاب! أي حاجة تاني؟',
    'تسلملي أنت! 🥰 بجد ده واجبي! لو محتاج حاجة تاني قولي!',
    'إنت اللي ذوق! 😍 دايمًا تحت أمرك يا بطل!',
    'العفو خالص! 🌟 ده أنا مبسوط إني قدرت أساعد!',
  ],
  bye: [
    'باي يا حبيبي! 👋 ربنا معاك! لو محتاج حاجة ارجعلي في أي وقت ❤️',
    'سلام يا غالي! 😊 يومك يكون جميل! مستنيك ترجع! 🌟',
    'مع السلامة يا بطل! 💪 وأنا هنا 24/7 لو احتجتني!',
    'يلا في أمان الله! 😄 نورتني والله! ارجعلي بسرعة! 🎉',
  ],
  impressed: [
    'يسلمو عليك! 😍 أنا كمان مبسوط إنك عجبك! 🎉',
    'هههه ده أنت اللي جامد! 🔥 شكراً ليك يا بطل!',
    'أحلى كلام من أحلى إنسان! ✨ ده أنت اللي تحفة!',
    'إييه الجمال ده! 😂❤️ كلامك ده حلّى يومي!',
  ],
  love: [
    'وأنا كمان بحبك يا جميل! 😍❤️ إنت أحلى يوزر عندي!',
    'أووه ده كلام يذوب! 🥺❤️ تسلملي يا قمر!',
    'ربنا يخليك يا حبيبي! 😊💕 ده أنت سكر على الآخر!',
    'الله عليك! 😍 كلامك ده خلاني أطير من الفرحة! ❤️✨',
  ],
  joke: [
    'طيب خد دي: واحد سأل صاحبه: "ليه بتدرس والامتحان بعد أسبوع؟" قاله: "عشان خايف أنسى إني مذاكرتش!" 😂😂',
    'واحد قال لصاحبه: "أنا بقيت بحب المذاكرة" صاحبه قاله: "إمتى؟" قاله: "في الأحلام!" 😂🤣',
    'ليه الكتاب راح الدكتور؟ عشان حاسس إنه مش في حالته الطبيعية.. صفحاته بتتقلب! 📚😂',
    'واحد طالب سأل أستاذه: "هل ينفع أتعاقب على حاجة معملتهاش؟" الأستاذ قال: "لأ طبعاً" الطالب قال: "تمام.. أنا معملتش الواجب!" 😂',
  ],
  whoAreYou: [
    'أنا المساعد الذكي بتاع Campus Market! 🤖✨ هنا عشان أساعدك تلاقي منتجات، كتب، أو حتى حاجات ضايعة. وكمان ينفع نتكلم ونهزر! 😄',
    'أنا صاحبك الذكي في Campus Market! 🧠 بدور على منتجات، بساعدك تلاقي كتب، وبنبسط مع بعض كمان! 😊',
    'أنا الـ AI Assistant بتاع Campus Market 🎯 بس مش بوت عادي — أنا صاحبك اللي بيفهمك ويساعدك! 💪',
  ],
  aboutApp: [
    'Campus Market ده سوق أونلاين للطلبة الجامعيين! 🎓 تقدر تبيع وتشتري منتجات، كتب، ولو ضاعت منك حاجة ممكن تلاقيها هنا! عايز تدور على حاجة معينة؟',
    'ده تطبيق جامد للطلبة! 🔥 فيه marketplace للمنتجات، مكتبة لبيع وشراء الكتب، وقسم للمفقودات. يعني كل حاجة في مكان واحد! 😊',
  ],
  help: [
    'طبعاً أساعدك! 💪 قولي بالظبط عايز إيه:\n• عايز تدور على منتج؟ قولي اسمه!\n• عايز تعرف حاجة عن الموقع؟ اسأل!\n• أو حتى عايز تتكلم وخلاص 😄',
    'أكيد! 😊 أنا هنا عشانك! ممكن:\n• أدورلك على أي منتج أو كتاب 📦\n• أساعدك تلاقي حاجة ضايعة 🔍\n• أو نتكلم في أي حاجة! 💬',
  ],
};

// Track last response to avoid repetition
let lastResponseIndex = {};

function getRandomResponse(type) {
  const options = responses[type];
  if (!options || options.length === 0) return null;
  
  // Get a different index than last time for this type
  let idx;
  do {
    idx = Math.floor(Math.random() * options.length);
  } while (idx === lastResponseIndex[type] && options.length > 1);
  
  lastResponseIndex[type] = idx;
  return options[idx];
}

function detectIntent(message) {
  const lower = message.toLowerCase().trim();
  
  // Check greeting patterns
  for (const pattern of greetingPatterns) {
    if (pattern.patterns.some(p => lower.includes(p))) {
      return pattern.type;
    }
  }
  
  // Check if it's a product query
  if (productKeywords.some(kw => lower.includes(kw))) {
    return 'product';
  }
  
  return 'general';
}

async function smartFallback(userMessage, conversationHistory = []) {
  const intent = detectIntent(userMessage);
  
  // Handle product queries with Firestore search
  if (intent === 'product') {
    return await handleProductQuery(userMessage);
  }
  
  // Handle known conversation patterns
  if (responses[intent]) {
    return getRandomResponse(intent);
  }
  
  // General fallback for unknown queries
  return getGeneralResponse(userMessage);
}

async function handleProductQuery(userMessage) {
  try {
    const dbContext = await fetchCampusData();
    const lower = userMessage.toLowerCase();
    
    // Extract search words (filter out short/common words)
    const stopWords = ['عايز', 'عايزة', 'محتاج', 'محتاجة', 'اشتري', 'اشترى', 'ابحث', 'دور', 'فين', 'في', 'على', 'من', 'عن', 'أنا', 'انا'];
    const searchWords = lower.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
    
    // Search products
    const matchedProducts = dbContext.products.filter(p => 
      p.title && searchWords.some(word => p.title.toLowerCase().includes(word))
    );
    
    // Search library
    const matchedBooks = dbContext.library.filter(b => 
      b.title && searchWords.some(word => b.title.toLowerCase().includes(word))
    );
    
    // Search lost items
    const matchedLost = dbContext.lostItems.filter(l => 
      l.title && searchWords.some(word => l.title.toLowerCase().includes(word))
    );

    // If no exact matches, try broader search with original message keywords
    if (matchedProducts.length === 0 && matchedBooks.length === 0 && matchedLost.length === 0) {
      const allWords = lower.split(/\s+/).filter(w => w.length > 2);
      matchedProducts.push(...dbContext.products.filter(p => 
        p.title && allWords.some(word => p.title.toLowerCase().includes(word))
      ));
      matchedBooks.push(...dbContext.library.filter(b => 
        b.title && allWords.some(word => b.title.toLowerCase().includes(word))
      ));
      matchedLost.push(...dbContext.lostItems.filter(l => 
        l.title && allWords.some(word => l.title.toLowerCase().includes(word))
      ));
    }
    
    let reply = '';
    const intros = [
      'أيوه طبعاً، لقيتلك حاجات بخصوص "' + userMessage + '"! 😍',
      'تمام يا بطل! لقيتلك كده كذا حاجة حلوة! 🔥',
      'خد عندك يا معلم! دول أحسن حاجات لقيتهالك! ✨',
      'أكيد! دورتلك ولقيتلك كده كام حاجة! 😊',
    ];
    
    if (matchedProducts.length > 0 || matchedBooks.length > 0 || matchedLost.length > 0) {
      reply += intros[Math.floor(Math.random() * intros.length)] + '\n';
    }
    
    if (matchedProducts.length > 0) {
      matchedProducts.slice(0, 5).forEach(p => {
        const searchTerm = encodeURIComponent(p.title);
        reply += `📦 متاح في المتجر: ${p.title} (${p.category || 'قسم عام'})${p.price ? ' — ' + p.price + ' جنيه' : ''}\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }
    
    if (matchedBooks.length > 0) {
      matchedBooks.slice(0, 5).forEach(b => {
        const searchTerm = encodeURIComponent(b.title);
        reply += `📚 متاح في المكتبة: ${b.title} (${b.category || 'عام'})\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }
    
    if (matchedLost.length > 0) {
      matchedLost.slice(0, 3).forEach(l => {
        const searchTerm = encodeURIComponent(l.title);
        reply += `🔍 في المفقودات: ${l.title} — ${l.status || ''}\n`;
        reply += `رابط المنتج: https://campusmarket.com/search?q=${searchTerm}\n`;
      });
    }
    
    if (reply) {
      const outros = [
        'تحب أساعدك في حاجة تانية؟ 😊',
        'لو عايز حاجة تانية قولي! 💪',
        'أي خدمة تانية أنا موجود! ✨',
      ];
      reply += '\n' + outros[Math.floor(Math.random() * outros.length)];
      return reply;
    }
    
    // Nothing found — suggest browsing with a link
    const searchTerm = encodeURIComponent(searchWords.join(' ') || userMessage);
    const notFoundReplies = [
      `مش لاقي حاجة بالاسم ده بالظبط دلوقتي 😅 بس جرب تشوف النتائج هنا:\nhttps://campusmarket.com/search?q=${searchTerm}\nأو قولي اسم تاني وأدورلك! 💪`,
      `للأسف مش لاقي تطابق بالظبط 😔 بس ممكن تلاقي حاجة قريبة هنا:\nhttps://campusmarket.com/search?q=${searchTerm}\nأو جرب بكلمات تانية! ✨`,
      `مش لاقي نتائج دلوقتي 🤔 شوف لو في حاجة تعجبك هنا:\nhttps://campusmarket.com/search?q=${searchTerm}\nولو محتاج حاجة تانية قولي! 😊`,
    ];
    return notFoundReplies[Math.floor(Math.random() * notFoundReplies.length)];
    
  } catch (err) {
    console.error('Product search error:', err);
    return 'في مشكلة في البحث دلوقتي 😅 بس ممكن تروح قسم المنتجات وتتصفح بنفسك! 🛒';
  }
}

function getGeneralResponse(message) {
  const generalReplies = [
    `سؤال حلو! 😊 أنا بصراحة أحسن حاجة فيها إني أساعدك تلاقي منتجات وكتب في Campus Market 📦 بس كمان بحب أهزر! قولي عايز إيه بالظبط وأنا أساعدك 💪`,
    `يا سلام على السؤال! 🤔 أنا متخصص في مساعدتك في Campus Market — يعني لو عايز منتج، كتاب، أو حتى حاجة ضايعة أنا موجود! غير كده ممكن نتكلم عادي 😄`,
    `أنا فاهم عليك! 😊 بس خليني أقولك إن أنا أحسن حاجة بعملها إني أدورلك على منتجات في الموقع. جرب قولي "عايز لابتوب" أو "محتاج كتاب" وشوف السحر! ✨`,
    `حلو أوي! 😄 أنا هنا عشان أساعدك في أي حاجة تخص Campus Market! لو عندك سؤال تاني أو عايز تدور على حاجة قولي! 🎯`,
    `ده سؤال مميز! ✨ أنا بحب أساعد الطلبة يلاقوا اللي محتاجينه. جرب تسألني عن أي منتج أو كتاب وهلاقيهولك! 🔍`,
  ];
  return generalReplies[Math.floor(Math.random() * generalReplies.length)];
}

// ===== Cache for campus data =====
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchCampusData() {
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const productsData = [];
    const lostData = [];
    const libraryData = [];

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

// ===== Main Function =====
export async function askCampusAssistant(userMessage, conversationHistory = []) {
  // Build context only when the message seems product-related
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

  // Try Gemini models first
  const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      // Build conversation history for multi-turn
      const historyForModel = conversationHistory.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({
        history: historyForModel,
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 500,
        },
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
    } catch (e) {
      console.warn(`Model ${modelName} failed:`, e.message);
      continue;
    }
  }

  // ===== Smart Fallback when ALL Gemini models fail =====
  console.log('All Gemini models failed, using smart fallback');
  return await smartFallback(userMessage, conversationHistory);
}
