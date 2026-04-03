import React from "react";

const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, image: "📚", views: 34 },
  { id: 2, title: "ميكروسكوب محمول", price: 320, image: "🔬", views: 87 },
  { id: 3, title: "كول روب معمل", price: 30, image: "🥼", views: 19 },
];

export default function ProfilePage() {

  const handleLogout = () => {
    alert("تم تسجيل الخروج!");
    // هنا ممكن تعملي redirect
  };

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", direction: "rtl", fontFamily: "Cairo" }}>

      {/* HEADER */}
      <div style={{
        background: "#1a3a2a",
        padding: "40px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        color: "white"
      }}>
        <div style={{
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "#c8a84b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: "900",
          color: "#1a3a2a"
        }}>
          م
        </div>

        <div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>محمد أحمد السيد</div>
          <div style={{ color: "#c8a84b", fontSize: 13 }}>🎓 طالب — الفرقة الثالثة، الفيزياء</div>

          <div style={{ display: "flex", gap: 25, marginTop: 10 }}>
            {[
              { num: "12", label: "منتج" },
              { num: "8", label: "صفقة" },
              { num: "4.8⭐", label: "تقييم" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "900" }}>{s.num}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div style={cardStyle}>
        <div style={titleStyle}>🛒 منتجاتي</div>

        {mockProducts.map(p => (
          <div key={p.id} style={rowStyle}>
            <span style={{ fontSize: 24 }}>{p.image}</span>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#8a7d6b" }}>
                👁 {p.views} مشاهدة
              </div>
            </div>

            <div style={{ color: "#c8a84b", fontWeight: "900" }}>
              {p.price} ج
            </div>
          </div>
        ))}
      </div>

      {/* SETTINGS */}
      <div style={cardStyle}>
        <div style={titleStyle}>⚙️ إعدادات الحساب</div>

        {[
          { label: "الاسم", value: "محمد أحمد السيد", icon: "👤" },
          { label: "البريد", value: "m.ahmed@sci.cu.edu.eg", icon: "📧" },
          { label: "الرقم الجامعي", value: "20210234", icon: "🪪" },
          { label: "القسم", value: "الفيزياء", icon: "⚛️" },
        ].map((f, i) => (
          <div key={i} style={rowStyle}>
            <span>{f.icon}</span>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8a7d6b" }}>{f.label}</div>
              <div style={{ fontWeight: "600" }}>{f.value}</div>
            </div>

            <span style={{ color: "#c8a84b", cursor: "pointer" }}>تعديل</span>
          </div>
        ))}
      </div>

      {/* LOGOUT */}
      <div style={{ padding: 20 }}>
        <button onClick={handleLogout} style={{
          width: "100%",
          background: "#c0392b",
          color: "white",
          padding: 14,
          border: "none",
          borderRadius: 12,
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: 15
        }}>
          🚪 تسجيل الخروج
        </button>
      </div>

    </div>
  );
}

/* Styles */
const cardStyle = {
  background: "white",
  margin: 16,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #ddd3c0",
};

const titleStyle = {
  padding: 14,
  fontWeight: "bold",
  borderBottom: "1px solid #ddd3c0",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderBottom: "1px solid #f0ebe0",
};