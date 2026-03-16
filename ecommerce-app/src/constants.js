
//this file contains all the constants used in the app, such as colors, fonts, mock data, and navigation items. It helps to keep the code organized and maintainable.
export const COLORS = { 
  primary: "#1a3a2a",
  accent: "#c8a84b",
  light: "#f5f0e8",
  white: "#ffffff",
  muted: "#8a7d6b",
  danger: "#c0392b",
  success: "#27ae60",
  info: "#2980b9",
  border: "#ddd3c0",
  cardBg: "#fffdf8",
};

export const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap');
`;

export const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, condition: "جيد جداً", seller: "أحمد محمد", sellerType: "طالب", category: "كتب", image: "📚", views: 34, time: "منذ ساعتين", status: "active" },
  { id: 2, title: "ميكروسكوب محمول", price: 320, condition: "ممتاز", seller: "د. سارة علي", sellerType: "دكتور", category: "معدات", image: "🔬", views: 87, time: "منذ يوم", status: "active" },
  { id: 3, title: "كول روب معمل", price: 30, condition: "مقبول", seller: "فاطمة حسن", sellerType: "خريجة", category: "ملابس", image: "🥼", views: 19, time: "منذ 3 أيام", status: "active" },
  { id: 4, title: "آلة حاسبة علمية Casio", price: 150, condition: "جيد", seller: "محمود إبراهيم", sellerType: "طالب", category: "أدوات", image: "🔢", views: 52, time: "منذ 5 أيام", status: "active" },
  { id: 5, title: "كتاب الكيمياء العضوية", price: 60, condition: "جيد جداً", seller: "نور أحمد", sellerType: "خريجة", category: "كتب", image: "📗", views: 41, time: "منذ أسبوع", status: "sold" },
  { id: 6, title: "حقيبة ظهر للكلية", price: 85, condition: "جيد", seller: "يوسف سامي", sellerType: "طالب", category: "أخرى", image: "🎒", views: 28, time: "منذ أسبوعين", status: "active" },
];

export const mockLibrary = [
  { id: 1, title: "بالطو معمل مقاس L", available: true, borrower: null, image: "🥼", category: "ملابس" },
  { id: 2, title: "بالطو معمل مقاس M", available: false, borrower: "علي حسن", image: "🥼", category: "ملابس" },
  { id: 3, title: "نظارة واقية", available: true, borrower: null, image: "🥽", category: "معدات" },
  { id: 4, title: "قفازات معمل", available: true, borrower: null, image: "🧤", category: "معدات" },
  { id: 5, title: "بالطو معمل مقاس S", available: false, borrower: "منى إبراهيم", image: "🥼", category: "ملابس" },
];

export const mockLostFound = [
  { id: 1, title: "محفظة جلد بنية", description: "وُجدت بالقرب من قاعة 101", finder: "طالب مجهول", location: "مبنى A", date: "اليوم", image: "👛", claimed: false },
  { id: 2, title: "كارنيه جامعي", description: "اسم الطالب: م.م.غير واضح", finder: "حارس الأمن", location: "عند البوابة", date: "أمس", image: "🪪", claimed: false },
  { id: 3, title: "مفاتيح خضراء", description: "مفتاحين على حلقة خضراء", finder: "دكتورة ريم", location: "معمل 3", date: "منذ يومين", image: "🔑", claimed: true },
];

export const mockMessages = [
  { id: 1, from: "أحمد محمد", product: "كتاب حساب التفاضل", message: "هل الكتاب لا يزال متاحاً؟", time: "منذ 10 دقائق", unread: true },
  { id: 2, from: "فاطمة علي", product: "ميكروسكوب محمول", message: "هل يمكن التفاوض في السعر؟", time: "منذ ساعة", unread: true },
  { id: 3, from: "محمود سامي", product: "كول روب معمل", message: "متى يمكن الاستلام؟", time: "أمس", unread: false },
];

export const stats = [
  { label: "منتج نشط", value: "142", icon: "🛒", color: "#1a3a2a" },
  { label: "صفقة مكتملة", value: "89", icon: "✅", color: "#27ae60" },
  { label: "مستخدم مسجل", value: "1.2k", icon: "👥", color: "#2980b9" },
  { label: "عنصر في المكتبة", value: "38", icon: "📚", color: "#c8a84b" },
];

export const navItems = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "products", label: "المنتجات", icon: "🛒" },
  { id: "library", label: "المكتبة", icon: "📚" },
  { id: "lostfound", label: "المفقودات", icon: "🔍" },
  { id: "messages", label: "الرسائل", icon: "💬" },
  { id: "profile", label: "حسابي", icon: "👤" },
];