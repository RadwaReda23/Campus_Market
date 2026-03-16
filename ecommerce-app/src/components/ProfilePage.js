import { COLORS, mockProducts } from "../constants";

export default function ProfilePage() {
  return (
    <>
      <div className="profile-header">
        <div className="profile-avatar">م</div>
        <div>
          <div className="profile-name">محمد أحمد السيد</div>
          <div className="profile-role">🎓 طالب — الفرقة الثالثة، قسم الفيزياء</div>
          <div className="profile-stats">
            <div className="pstat"><div className="pstat-num">12</div><div className="pstat-label">منتج معروض</div></div>
            <div className="pstat"><div className="pstat-num">8</div><div className="pstat-label">صفقة مكتملة</div></div>
            <div className="pstat"><div className="pstat-num">4.8 ⭐</div><div className="pstat-label">التقييم</div></div>
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
                background: COLORS.cardBg,
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
                background: COLORS.cardBg,
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
  );
}