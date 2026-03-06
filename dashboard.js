import { useState } from "react";

const COLORS = {
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

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap');
`;

const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, condition: "جيد جداً", seller: "أحمد محمد", sellerType: "طالب", category: "كتب", image: "📚", views: 34, time: "منذ ساعتين", status: "active" },
  { id: 2, title: "ميكروسكوب محمول", price: 320, condition: "ممتاز", seller: "د. سارة علي", sellerType: "دكتور", category: "معدات", image: "🔬", views: 87, time: "منذ يوم", status: "active" },
  { id: 3, title: "كول روب معمل", price: 30, condition: "مقبول", seller: "فاطمة حسن", sellerType: "خريجة", category: "ملابس", image: "🥼", views: 19, time: "منذ 3 أيام", status: "active" },
  { id: 4, title: "آلة حاسبة علمية Casio", price: 150, condition: "جيد", seller: "محمود إبراهيم", sellerType: "طالب", category: "أدوات", image: "🔢", views: 52, time: "منذ 5 أيام", status: "active" },
  { id: 5, title: "كتاب الكيمياء العضوية", price: 60, condition: "جيد جداً", seller: "نور أحمد", sellerType: "خريجة", category: "كتب", image: "📗", views: 41, time: "منذ أسبوع", status: "sold" },
  { id: 6, title: "حقيبة ظهر للكلية", price: 85, condition: "جيد", seller: "يوسف سامي", sellerType: "طالب", category: "أخرى", image: "🎒", views: 28, time: "منذ أسبوعين", status: "active" },
];

const mockLibrary = [
  { id: 1, title: "بالطو معمل مقاس L", available: true, borrower: null, image: "🥼", category: "ملابس" },
  { id: 2, title: "بالطو معمل مقاس M", available: false, borrower: "علي حسن", image: "🥼", category: "ملابس" },
  { id: 3, title: "نظارة واقية", available: true, borrower: null, image: "🥽", category: "معدات" },
  { id: 4, title: "قفازات معمل", available: true, borrower: null, image: "🧤", category: "معدات" },
  { id: 5, title: "بالطو معمل مقاس S", available: false, borrower: "منى إبراهيم", image: "🥼", category: "ملابس" },
];

const mockLostFound = [
  { id: 1, title: "محفظة جلد بنية", description: "وُجدت بالقرب من قاعة 101", finder: "طالب مجهول", location: "مبنى A", date: "اليوم", image: "👛", claimed: false },
  { id: 2, title: "كارنيه جامعي", description: "اسم الطالب: م.م.غير واضح", finder: "حارس الأمن", location: "عند البوابة", date: "أمس", image: "🪪", claimed: false },
  { id: 3, title: "مفاتيح خضراء", description: "مفتاحين على حلقة خضراء", finder: "دكتورة ريم", location: "معمل 3", date: "منذ يومين", image: "🔑", claimed: true },
];

const mockMessages = [
  { id: 1, from: "أحمد محمد", product: "كتاب حساب التفاضل", message: "هل الكتاب لا يزال متاحاً؟", time: "منذ 10 دقائق", unread: true },
  { id: 2, from: "فاطمة علي", product: "ميكروسكوب محمول", message: "هل يمكن التفاوض في السعر؟", time: "منذ ساعة", unread: true },
  { id: 3, from: "محمود سامي", product: "كول روب معمل", message: "متى يمكن الاستلام؟", time: "أمس", unread: false },
];

const stats = [
  { label: "منتج نشط", value: "142", icon: "🛒", color: COLORS.primary },
  { label: "صفقة مكتملة", value: "89", icon: "✅", color: COLORS.success },
  { label: "مستخدم مسجل", value: "1.2k", icon: "👥", color: COLORS.info },
  { label: "عنصر في المكتبة", value: "38", icon: "📚", color: COLORS.accent },
];

const navItems = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "products", label: "المنتجات", icon: "🛒" },
  { id: "library", label: "المكتبة", icon: "📚" },
  { id: "lostfound", label: "المفقودات", icon: "🔍" },
  { id: "messages", label: "الرسائل", icon: "💬" },
  { id: "profile", label: "حسابي", icon: "👤" },
];

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeLibraryTab, setActiveLibraryTab] = useState("borrow");

  const unreadCount = mockMessages.filter(m => m.unread).length;

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; background: ${COLORS.light}; color: ${COLORS.primary}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.light}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.accent}; border-radius: 3px; }

        .app { display: flex; min-height: 100vh; }

        /* SIDEBAR */
        .sidebar {
          width: ${sidebarOpen ? "240px" : "68px"};
          background: ${COLORS.primary};
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; right: 0;
          height: 100vh;
          z-index: 100;
          box-shadow: -4px 0 20px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .sidebar-logo {
          padding: 20px 16px;
          border-bottom: 1px solid rgba(200,168,75,0.3);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 40px; height: 40px;
          background: ${COLORS.accent};
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .logo-text {
          color: white;
          overflow: hidden;
          white-space: nowrap;
        }
        .logo-text h3 { font-size: 13px; font-weight: 700; line-height: 1.3; }
        .logo-text span { font-size: 11px; color: ${COLORS.accent}; font-family: 'Amiri', serif; }

        .nav-items { flex: 1; padding: 16px 8px; display: flex; flex-direction: column; gap: 4px; }
        .nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 12px;
          border-radius: 10px;
          cursor: pointer;
          color: rgba(255,255,255,0.7);
          transition: all 0.2s;
          white-space: nowrap;
          position: relative;
        }
        .nav-item:hover { background: rgba(200,168,75,0.15); color: white; }
        .nav-item.active { background: ${COLORS.accent}; color: ${COLORS.primary}; font-weight: 700; }
        .nav-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
        .nav-label { font-size: 13px; overflow: hidden; }
        .badge {
          background: ${COLORS.danger};
          color: white; font-size: 10px; font-weight: 700;
          width: 18px; height: 18px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-right: auto;
          flex-shrink: 0;
        }

        .sidebar-toggle {
          padding: 16px;
          border-top: 1px solid rgba(200,168,75,0.2);
        }
        .toggle-btn {
          background: rgba(255,255,255,0.1);
          border: none; border-radius: 8px;
          color: white; cursor: pointer;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          transition: background 0.2s;
        }
        .toggle-btn:hover { background: rgba(200,168,75,0.3); }

        /* MAIN */
        .main {
          margin-right: ${sidebarOpen ? "240px" : "68px"};
          flex: 1;
          transition: margin-right 0.3s ease;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* TOPBAR */
        .topbar {
          background: white;
          padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 2px solid ${COLORS.border};
          position: sticky; top: 0; z-index: 50;
        }
        .page-title { font-size: 20px; font-weight: 700; color: ${COLORS.primary}; }
        .topbar-actions { display: flex; align-items: center; gap: 16px; }
        .search-box {
          display: flex; align-items: center; gap: 8px;
          background: ${COLORS.light};
          border: 1px solid ${COLORS.border};
          border-radius: 10px;
          padding: 8px 14px;
        }
        .search-box input {
          border: none; background: transparent;
          font-family: 'Cairo', sans-serif; font-size: 13px;
          outline: none; width: 200px; direction: rtl;
          color: ${COLORS.primary};
        }
        .search-box input::placeholder { color: ${COLORS.muted}; }
        .avatar {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent});
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px;
          cursor: pointer;
        }

        /* CONTENT */
        .content { padding: 28px; flex: 1; }

        /* STATS */
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: white; border-radius: 16px;
          padding: 20px; border: 1px solid ${COLORS.border};
          display: flex; align-items: center; gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .stat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }
        .stat-info h2 { font-size: 26px; font-weight: 900; color: ${COLORS.primary}; }
        .stat-info p { font-size: 12px; color: ${COLORS.muted}; margin-top: 2px; }

        /* GRID LAYOUTS */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

        /* SECTION CARD */
        .section-card {
          background: white; border-radius: 16px;
          border: 1px solid ${COLORS.border};
          overflow: hidden;
        }
        .section-header {
          padding: 16px 20px;
          border-bottom: 1px solid ${COLORS.border};
          display: flex; align-items: center; justify-content: space-between;
        }
        .section-title { font-size: 15px; font-weight: 700; color: ${COLORS.primary}; display: flex; align-items: center; gap: 8px; }
        .section-link { font-size: 12px; color: ${COLORS.accent}; cursor: pointer; font-weight: 600; }
        .section-body { padding: 16px 20px; }

        /* PRODUCT CARDS */
        .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .product-card {
          background: ${COLORS.cardBg}; border-radius: 14px;
          border: 1px solid ${COLORS.border};
          overflow: hidden;
          transition: all 0.25s;
          cursor: pointer;
        }
        .product-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(26,58,42,0.12); border-color: ${COLORS.accent}; }
        .product-image {
          height: 100px; background: linear-gradient(135deg, ${COLORS.light}, #e8dfc8);
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; position: relative;
        }
        .product-badge {
          position: absolute; top: 8px; left: 8px;
          padding: 3px 8px; border-radius: 20px;
          font-size: 10px; font-weight: 700;
        }
        .badge-active { background: #d4f4e0; color: ${COLORS.success}; }
        .badge-sold { background: #fde8e8; color: ${COLORS.danger}; }
        .product-info { padding: 12px; }
        .product-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; line-height: 1.4; }
        .product-price { font-size: 17px; font-weight: 900; color: ${COLORS.accent}; }
        .product-price span { font-size: 12px; font-weight: 400; color: ${COLORS.muted}; }
        .product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .product-seller { font-size: 11px; color: ${COLORS.muted}; }
        .product-views { font-size: 11px; color: ${COLORS.muted}; display: flex; align-items: center; gap: 3px; }
        .condition-badge {
          font-size: 10px; padding: 2px 7px; border-radius: 10px;
          background: ${COLORS.light}; color: ${COLORS.muted}; margin-top: 4px; display: inline-block;
        }

        /* LIBRARY */
        .library-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .lib-tab {
          padding: 8px 16px; border-radius: 20px; cursor: pointer;
          font-size: 13px; font-weight: 600; border: 2px solid ${COLORS.border};
          background: white; color: ${COLORS.muted}; transition: all 0.2s;
        }
        .lib-tab.active { background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary}; }
        .lib-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 10px;
          border: 1px solid ${COLORS.border};
          margin-bottom: 8px; background: ${COLORS.cardBg};
          transition: all 0.2s;
        }
        .lib-item:hover { border-color: ${COLORS.accent}; }
        .lib-emoji { font-size: 24px; }
        .lib-info { flex: 1; }
        .lib-title { font-size: 13px; font-weight: 700; }
        .lib-status { font-size: 11px; margin-top: 2px; }
        .available { color: ${COLORS.success}; }
        .unavailable { color: ${COLORS.danger}; }
        .borrow-btn {
          padding: 6px 14px; border-radius: 8px; border: none;
          font-family: 'Cairo', sans-serif; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-primary { background: ${COLORS.primary}; color: white; }
        .btn-primary:hover { background: #0f2318; }
        .btn-disabled { background: ${COLORS.border}; color: ${COLORS.muted}; cursor: not-allowed; }

        /* LOST & FOUND */
        .lost-item {
          display: flex; gap: 14px; padding: 14px;
          border-radius: 12px; border: 1px solid ${COLORS.border};
          margin-bottom: 10px; background: ${COLORS.cardBg};
          transition: all 0.2s;
        }
        .lost-item:hover { border-color: ${COLORS.accent}; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .lost-emoji { font-size: 32px; }
        .lost-info { flex: 1; }
        .lost-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
        .lost-desc { font-size: 12px; color: ${COLORS.muted}; margin-bottom: 6px; }
        .lost-meta { display: flex; gap: 12px; }
        .lost-tag {
          font-size: 11px; padding: 2px 8px; border-radius: 10px;
          background: ${COLORS.light}; color: ${COLORS.muted};
        }
        .claimed-badge { background: #d4f4e0; color: ${COLORS.success}; }

        /* MESSAGES */
        .message-item {
          display: flex; align-items: center; gap: 12px;
          padding: 14px; border-radius: 12px;
          border: 1px solid ${COLORS.border};
          margin-bottom: 8px; background: ${COLORS.cardBg};
          cursor: pointer; transition: all 0.2s;
        }
        .message-item:hover { border-color: ${COLORS.accent}; }
        .message-item.unread { border-right: 3px solid ${COLORS.accent}; background: #fffbf0; }
        .msg-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent});
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;
        }
        .msg-info { flex: 1; }
        .msg-from { font-size: 13px; font-weight: 700; }
        .msg-product { font-size: 11px; color: ${COLORS.accent}; }
        .msg-text { font-size: 12px; color: ${COLORS.muted}; margin-top: 2px; }
        .msg-time { font-size: 11px; color: ${COLORS.muted}; flex-shrink: 0; }

        /* ALERT STRIP */
        .alert-strip {
          background: linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent}11);
          border: 1px solid ${COLORS.accent}44;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        /* ADD PRODUCT BTN */
        .add-btn {
          background: ${COLORS.primary}; color: white;
          border: none; border-radius: 10px;
          padding: 10px 18px; font-family: 'Cairo', sans-serif;
          font-size: 13px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .add-btn:hover { background: #0f2318; transform: translateY(-1px); }

        /* FILTER BAR */
        .filter-bar {
          display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .filter-chip {
          padding: 6px 14px; border-radius: 20px;
          border: 1px solid ${COLORS.border}; background: white;
          font-family: 'Cairo', sans-serif; font-size: 12px;
          cursor: pointer; color: ${COLORS.muted}; transition: all 0.2s;
        }
        .filter-chip:hover, .filter-chip.active {
          background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary};
        }

        /* PROFILE */
        .profile-header {
          background: linear-gradient(135deg, ${COLORS.primary} 0%, #2d5a40 100%);
          border-radius: 16px; padding: 28px;
          color: white; margin-bottom: 20px;
          display: flex; align-items: center; gap: 20px;
        }
        .profile-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: ${COLORS.accent};
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 900;
          flex-shrink: 0;
        }
        .profile-name { font-size: 20px; font-weight: 700; }
        .profile-role { color: ${COLORS.accent}; font-size: 13px; margin-top: 3px; }
        .profile-stats { display: flex; gap: 24px; margin-top: 12px; }
        .pstat { text-align: center; }
        .pstat-num { font-size: 20px; font-weight: 900; }
        .pstat-label { font-size: 11px; opacity: 0.8; }

        /* SELLER TYPE BADGE */
        .seller-type {
          font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 700;
        }
        .type-student { background: #dbeafe; color: #1d4ed8; }
        .type-doctor { background: #fce7f3; color: #be185d; }
        .type-grad { background: #dcfce7; color: #15803d; }
        .type-staff { background: #fef3c7; color: #b45309; }

        @media (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .products-grid { grid-template-columns: repeat(2, 1fr); }
          .two-col { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">🔬</div>
            {sidebarOpen && (
              <div className="logo-text">
                <h3>سوق كلية العلوم</h3>
                <span>جامعة القاهرة</span>
              </div>
            )}
          </div>

          <div className="nav-items">
            {navItems.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => setActivePage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
                {item.id === "messages" && unreadCount > 0 && sidebarOpen && (
                  <span className="badge">{unreadCount}</span>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-toggle">
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="page-title">
              {navItems.find(n => n.id === activePage)?.icon} {navItems.find(n => n.id === activePage)?.label}
            </div>
            <div className="topbar-actions">
              <div className="search-box">
                <span>🔍</span>
                <input placeholder="ابحث في السوق..." />
              </div>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setActivePage("messages")}>
                <span style={{ fontSize: 20 }}>🔔</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -4, left: -4,
                    background: COLORS.danger, color: "white",
                    width: 16, height: 16, borderRadius: "50%",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>{unreadCount}</span>
                )}
              </div>
              <div className="avatar" onClick={() => setActivePage("profile")}>م</div>
              <button 
                onClick={() => alert("تم تسجيل الخروج بنجاح!")}
                style={{
                  background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "linear-gradient(135deg, #a93226, #c0392b)"}
                onMouseOut={(e) => e.target.style.background = "linear-gradient(135deg, #c0392b, #e74c3c)"}
              >
                🚪 تسجيل الخروج
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="content">

            {/* ===== HOME ===== */}
            {activePage === "home" && (
              <>
                <div className="alert-strip">
                  <span>📢</span>
                  <strong>جديد!</strong> تم إضافة 5 منتجات جديدة اليوم — تفقد المنتجات الأحدث
                  <span style={{ marginRight: "auto", color: COLORS.accent, cursor: "pointer", fontWeight: 600 }}>عرض الكل ←</span>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                  {stats.map((s, i) => (
                    <div className="stat-card" key={i}>
                      <div className="stat-icon" style={{ background: s.color + "18" }}>
                        {s.icon}
                      </div>
                      <div className="stat-info">
                        <h2>{s.value}</h2>
                        <p>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Products + Lost & Found */}
                <div className="two-col">
                  <div className="section-card">
                    <div className="section-header">
                      <span className="section-title">🛒 أحدث المنتجات</span>
                      <span className="section-link" onClick={() => setActivePage("products")}>عرض الكل ←</span>
                    </div>
                    <div className="section-body">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {mockProducts.slice(0, 4).map(p => (
                          <div key={p.id} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px", borderRadius: 10,
                            border: `1px solid ${COLORS.border}`,
                            cursor: "pointer", background: COLORS.cardBg,
                            transition: "all 0.2s"
                          }}>
                            <span style={{ fontSize: 28 }}>{p.image}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: COLORS.muted }}>{p.seller} · {p.time}</div>
                            </div>
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: 15, fontWeight: 900, color: COLORS.accent }}>{p.price} ج</div>
                              <div style={{ fontSize: 10, color: COLORS.muted }}>{p.views} مشاهدة</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Lost & Found Preview */}
                    <div className="section-card">
                      <div className="section-header">
                        <span className="section-title">🔍 المفقودات الأخيرة</span>
                        <span className="section-link" onClick={() => setActivePage("lostfound")}>عرض الكل ←</span>
                      </div>
                      <div className="section-body">
                        {mockLostFound.filter(l => !l.claimed).slice(0, 2).map(item => (
                          <div key={item.id} className="lost-item">
                            <span className="lost-emoji">{item.image}</span>
                            <div className="lost-info">
                              <div className="lost-title">{item.title}</div>
                              <div className="lost-desc">{item.description}</div>
                              <div className="lost-meta">
                                <span className="lost-tag">📍 {item.location}</span>
                                <span className="lost-tag">🕐 {item.date}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Messages */}
                    <div className="section-card">
                      <div className="section-header">
                        <span className="section-title">💬 الرسائل الجديدة</span>
                        <span className="section-link" onClick={() => setActivePage("messages")}>عرض الكل ←</span>
                      </div>
                      <div className="section-body">
                        {mockMessages.filter(m => m.unread).map(msg => (
                          <div key={msg.id} className={`message-item ${msg.unread ? "unread" : ""}`}>
                            <div className="msg-avatar">{msg.from[0]}</div>
                            <div className="msg-info">
                              <div className="msg-from">{msg.from}</div>
                              <div className="msg-product">📦 {msg.product}</div>
                              <div className="msg-text">{msg.message}</div>
                            </div>
                            <div className="msg-time">{msg.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ===== PRODUCTS ===== */}
            {activePage === "products" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.muted }}>
                    عرض <strong>{mockProducts.length}</strong> منتج
                  </div>
                  <button className="add-btn">
                    <span>+</span> إضافة منتج
                  </button>
                </div>

                <div className="filter-bar">
                  {["الكل", "كتب", "معدات", "ملابس", "أدوات", "أخرى"].map((f, i) => (
                    <button key={f} className={`filter-chip ${i === 0 ? "active" : ""}`}>{f}</button>
                  ))}
                </div>

                <div className="products-grid">
                  {mockProducts.map(p => (
                    <div key={p.id} className="product-card">
                      <div className="product-image">
                        <span>{p.image}</span>
                        <span className={`product-badge ${p.status === "active" ? "badge-active" : "badge-sold"}`}>
                          {p.status === "active" ? "متاح" : "تم البيع"}
                        </span>
                      </div>
                      <div className="product-info">
                        <div className="product-title">{p.title}</div>
                        <span className="condition-badge">الحالة: {p.condition}</span>
                        <div className="product-price">{p.price} <span>جنيه</span></div>
                        <div className="product-meta">
                          <div>
                            <div className="product-seller">{p.seller}</div>
                            <span className={`seller-type ${
                              p.sellerType === "طالب" ? "type-student" :
                              p.sellerType === "دكتور" ? "type-doctor" :
                              p.sellerType === "خريجة" || p.sellerType === "خريج" ? "type-grad" : "type-staff"
                            }`}>{p.sellerType}</span>
                          </div>
                          <div className="product-views">👁 {p.views}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== LIBRARY ===== */}
            {activePage === "library" && (
              <>
                <div className="alert-strip" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <span>📚</span>
                  <span>المكتبة مكان للاستعارة <strong>المجانية</strong> — يُرجى إعادة العناصر بعد الاستخدام وأخذ إثبات شخصيتك</span>
                </div>

                <div className="library-tabs">
                  <button className={`lib-tab ${activeLibraryTab === "borrow" ? "active" : ""}`} onClick={() => setActiveLibraryTab("borrow")}>
                    🥼 الاستعارة
                  </button>
                  <button className={`lib-tab ${activeLibraryTab === "lostfound" ? "active" : ""}`} onClick={() => setActiveLibraryTab("lostfound")}>
                    🔍 المفقودات
                  </button>
                </div>

                {activeLibraryTab === "borrow" && (
                  <div className="section-card">
                    <div className="section-header">
                      <span className="section-title">🥼 عناصر الاستعارة المجانية</span>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>
                        {mockLibrary.filter(l => l.available).length} متاح من أصل {mockLibrary.length}
                      </span>
                    </div>
                    <div className="section-body">
                      {mockLibrary.map(item => (
                        <div key={item.id} className="lib-item">
                          <span className="lib-emoji">{item.image}</span>
                          <div className="lib-info">
                            <div className="lib-title">{item.title}</div>
                            <div className={`lib-status ${item.available ? "available" : "unavailable"}`}>
                              {item.available ? "✅ متاح للاستعارة" : `❌ مستعار بواسطة: ${item.borrower}`}
                            </div>
                          </div>
                          <button
                            className={`borrow-btn ${item.available ? "btn-primary" : "btn-disabled"}`}
                            disabled={!item.available}
                          >
                            {item.available ? "استعر الآن" : "غير متاح"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeLibraryTab === "lostfound" && (
                  <div className="section-card">
                    <div className="section-header">
                      <span className="section-title">🔍 المفقودات في الكلية</span>
                      <button className="add-btn" style={{ fontSize: 12, padding: "7px 14px" }}>
                        + أضف مفقود
                      </button>
                    </div>
                    <div className="section-body">
                      {mockLostFound.map(item => (
                        <div key={item.id} className="lost-item">
                          <span className="lost-emoji">{item.image}</span>
                          <div className="lost-info">
                            <div className="lost-title">{item.title}</div>
                            <div className="lost-desc">{item.description}</div>
                            <div className="lost-meta">
                              <span className="lost-tag">👤 وُجد بواسطة: {item.finder}</span>
                              <span className="lost-tag">📍 {item.location}</span>
                              <span className="lost-tag">🕐 {item.date}</span>
                              {item.claimed && <span className={`lost-tag claimed-badge`}>✅ تم الاسترداد</span>}
                            </div>
                          </div>
                          <button
                            className={`borrow-btn ${!item.claimed ? "btn-primary" : "btn-disabled"}`}
                            disabled={item.claimed}
                          >
                            {item.claimed ? "مُسترد" : "هذا ملكي 🙋"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== LOST & FOUND ===== */}
            {activePage === "lostfound" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <p style={{ color: COLORS.muted, fontSize: 13 }}>
                    لقيت حاجة في الكلية؟ سجلها هنا وساعد صاحبها يلاقيها
                  </p>
                  <button className="add-btn">+ إضافة مفقود</button>
                </div>

                {mockLostFound.map(item => (
                  <div key={item.id} className="lost-item" style={{ marginBottom: 12 }}>
                    <span className="lost-emoji" style={{ fontSize: 40 }}>{item.image}</span>
                    <div className="lost-info">
                      <div className="lost-title" style={{ fontSize: 15 }}>{item.title}</div>
                      <div className="lost-desc">{item.description}</div>
                      <div className="lost-meta">
                        <span className="lost-tag">👤 {item.finder}</span>
                        <span className="lost-tag">📍 {item.location}</span>
                        <span className="lost-tag">🕐 {item.date}</span>
                        {item.claimed && <span className="lost-tag claimed-badge">✅ تم الاسترداد</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <button className={`borrow-btn ${!item.claimed ? "btn-primary" : "btn-disabled"}`} disabled={item.claimed}>
                        {item.claimed ? "مُسترد" : "هذا ملكي 🙋"}
                      </button>
                      <button style={{
                        padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                        background: "white", fontSize: 12, fontFamily: "'Cairo', sans-serif",
                        cursor: "pointer", color: COLORS.primary, fontWeight: 600
                      }}>💬 تواصل</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ===== MESSAGES ===== */}
            {activePage === "messages" && (
              <>
                <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
                  <button className="filter-chip active">الكل</button>
                  <button className="filter-chip">غير مقروءة ({unreadCount})</button>
                  <button className="filter-chip">المنتجات</button>
                  <button className="filter-chip">المفقودات</button>
                </div>

                {mockMessages.map(msg => (
                  <div key={msg.id} className={`message-item ${msg.unread ? "unread" : ""}`}>
                    <div className="msg-avatar">{msg.from[0]}</div>
                    <div className="msg-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="msg-from">{msg.from}</span>
                        {msg.unread && (
                          <span style={{
                            background: COLORS.accent, color: COLORS.primary,
                            fontSize: 10, fontWeight: 700,
                            padding: "1px 6px", borderRadius: 10
                          }}>جديد</span>
                        )}
                      </div>
                      <div className="msg-product">📦 {msg.product}</div>
                      <div className="msg-text">{msg.message}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <span className="msg-time">{msg.time}</span>
                      <button className="borrow-btn btn-primary">رد</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ===== PROFILE ===== */}
            {activePage === "profile" && (
              <>
                <div className="profile-header">
                  <div className="profile-avatar">م</div>
                  <div>
                    <div className="profile-name">محمد أحمد السيد</div>
                    <div className="profile-role">🎓 طالب — الفرقة الثالثة، قسم الفيزياء</div>
                    <div className="profile-stats">
                      <div className="pstat">
                        <div className="pstat-num">12</div>
                        <div className="pstat-label">منتج معروض</div>
                      </div>
                      <div className="pstat">
                        <div className="pstat-num">8</div>
                        <div className="pstat-label">صفقة مكتملة</div>
                      </div>
                      <div className="pstat">
                        <div className="pstat-num">4.8 ⭐</div>
                        <div className="pstat-label">التقييم</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="two-col">
                  <div className="section-card">
                    <div className="section-header">
                      <span className="section-title">🛒 منتجاتي</span>
                      <button className="add-btn" style={{ fontSize: 12, padding: "6px 12px" }}>+ إضافة</button>
                    </div>
                    <div className="section-body">
                      {mockProducts.slice(0, 3).map(p => (
                        <div key={p.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px", borderRadius: 8,
                          border: `1px solid ${COLORS.border}`, marginBottom: 8,
                          background: COLORS.cardBg
                        }}>
                          <span style={{ fontSize: 24 }}>{p.image}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: COLORS.muted }}>{p.views} مشاهدة</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent }}>{p.price} ج</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-header">
                      <span className="section-title">⚙️ إعدادات الحساب</span>
                    </div>
                    <div className="section-body">
                      {[
                        { label: "الاسم", value: "محمد أحمد السيد", icon: "👤" },
                        { label: "البريد الإلكتروني", value: "m.ahmed@sci.cu.edu.eg", icon: "📧" },
                        { label: "الرقم الجامعي", value: "20210234", icon: "🪪" },
                        { label: "القسم", value: "الفيزياء", icon: "⚛️" },
                      ].map((field, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px", borderRadius: 8,
                          border: `1px solid ${COLORS.border}`, marginBottom: 8,
                          background: COLORS.cardBg
                        }}>
                          <span style={{ fontSize: 18 }}>{field.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: COLORS.muted }}>{field.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{field.value}</div>
                          </div>
                          <span style={{ fontSize: 12, color: COLORS.accent, cursor: "pointer" }}>تعديل</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
