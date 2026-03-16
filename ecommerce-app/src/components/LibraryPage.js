import { useState } from "react";
import { COLORS, mockLibrary, mockLostFound } from "../constants";

export default function LibraryPage() {
  const [activeLibraryTab, setActiveLibraryTab] = useState("borrow");

  return (
    <>
      <div className="alert-strip" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
        <span>📚</span>
        <span>المكتبة مكان للاستعارة <strong>المجانية</strong> — يُرجى إعادة العناصر بعد الاستخدام</span>
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
                <button className={`borrow-btn ${item.available ? "btn-primary" : "btn-disabled"}`} disabled={!item.available}>
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
            <button className="add-btn" style={{ fontSize: 12, padding: "7px 14px" }}>+ أضف مفقود</button>
          </div>
          <div className="section-body">
            {mockLostFound.map(item => (
              <div key={item.id} className="lost-item">
                <span className="lost-emoji">{item.image}</span>
                <div className="lost-info">
                  <div className="lost-title">{item.title}</div>
                  <div className="lost-desc">{item.description}</div>
                  <div className="lost-meta">
                    <span className="lost-tag">👤 {item.finder}</span>
                    <span className="lost-tag">📍 {item.location}</span>
                    <span className="lost-tag">🕐 {item.date}</span>
                    {item.claimed && <span className="lost-tag claimed-badge">✅ تم الاسترداد</span>}
                  </div>
                </div>
                <button className={`borrow-btn ${!item.claimed ? "btn-primary" : "btn-disabled"}`} disabled={item.claimed}>
                  {item.claimed ? "مُسترد" : "هذا ملكي 🙋"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}