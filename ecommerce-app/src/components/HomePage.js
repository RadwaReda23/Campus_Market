import { COLORS, mockProducts, mockLostFound, mockMessages } from "../constants";

export default function HomePage({ setActivePage }) {
  return (
    <>
      <div className="alert-strip">
        <span>📢</span>
        <strong>جديد!</strong> تم إضافة 5 منتجات جديدة اليوم — تفقد المنتجات الأحدث
        <span
          style={{ marginRight: "auto", color: COLORS.accent, cursor: "pointer", fontWeight: 600 }}
          onClick={() => setActivePage("products")}
        >
          عرض الكل ←
        </span>
      </div>

      <div className="stats-grid">
        {[
          { label: "منتج نشط", value: "142", icon: "🛒", color: COLORS.primary },
          { label: "صفقة مكتملة", value: "89", icon: "✅", color: COLORS.success },
          { label: "مستخدم مسجل", value: "1.2k", icon: "👥", color: COLORS.info },
          { label: "عنصر في المكتبة", value: "38", icon: "📚", color: COLORS.accent },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: s.color + "18" }}>{s.icon}</div>
            <div className="stat-info">
              <h2>{s.value}</h2>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

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
  );
}