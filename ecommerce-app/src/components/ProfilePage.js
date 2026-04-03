import React from "react";

const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, image: "📚", views: 34 },
  { id: 2, title: "ميكروسكوب محمول", price: 320, image: "🔬", views: 87 },
  { id: 3, title: "كول روب معمل", price: 30, image: "🥼", views: 19 },
];

export default function ProfilePage() {

  const handleUpdate = () => {
    alert("تم تحديث البيانات (UI فقط)");
  };

  const handleLogout = () => {
    alert("تم تسجيل الخروج");
  };

  return (
    <div style={container}>

      {/* ===== HEADER ===== */}
      <div style={header}>
        <div style={avatar}>م</div>

        <div>
          <div style={name}>محمد أحمد السيد</div>
          <div style={role}>🎓 طالب — الفرقة الثالثة، الفيزياء</div>

          <div style={statsRow}>
            {[
              { num: "12", label: "منتج" },
              { num: "8", label: "صفقة" },
              { num: "4.8⭐", label: "تقييم" },
            ].map((s, i) => (
              <div key={i} style={statBox}>
                <div style={statNum}>{s.num}</div>
                <div style={statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PRODUCTS ===== */}
      <div style={card}>
        <div style={title}>🛒 منتجاتي</div>

        {mockProducts.map(p => (
          <div key={p.id} style={row}>
            <span style={{ fontSize: 24 }}>{p.image}</span>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#8a7d6b" }}>
                👁 {p.views} مشاهدة
              </div>
            </div>

            <div style={price}>{p.price} ج</div>
          </div>
        ))}
      </div>

      {/* ===== EDIT PROFILE (المهم) ===== */}
      <div style={card}>
        <div style={title}>⚙️ تعديل الحساب</div>

        <div style={{ padding: 16 }}>
          <label style={label}>الاسم</label>
          <input
            type="text"
            defaultValue="محمد أحمد السيد"
            style={input}
          />

          <label style={label}>الإيميل</label>
          <input
            type="email"
            defaultValue="m.ahmed@sci.cu.edu.eg"
            style={input}
          />

          <button style={updateBtn} onClick={handleUpdate}>
            Update Profile
          </button>
        </div>
      </div>

      {/* ===== LOGOUT ===== */}
      <div style={{ padding: 20 }}>
        <button style={logoutBtn} onClick={handleLogout}>
          🚪 تسجيل الخروج
        </button>
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const container = {
  background: "#f5f0e8",
  minHeight: "100vh",
  direction: "rtl",
  fontFamily: "Cairo, sans-serif"
};

const header = {
  background: "#1a3a2a",
  padding: "40px 24px",
  display: "flex",
  alignItems: "center",
  gap: 20,
  color: "white"
};

const avatar = {
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
};

const name = {
  fontSize: 20,
  fontWeight: "bold"
};

const role = {
  color: "#c8a84b",
  fontSize: 13,
  marginTop: 4
};

const statsRow = {
  display: "flex",
  gap: 25,
  marginTop: 10
};

const statBox = {
  textAlign: "center"
};

const statNum = {
  fontWeight: "900"
};

const statLabel = {
  fontSize: 11,
  opacity: 0.7
};

const card = {
  background: "white",
  margin: 16,
  borderRadius: 14,
  border: "1px solid #ddd3c0",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const title = {
  padding: 14,
  fontWeight: "bold",
  borderBottom: "1px solid #ddd3c0"
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderBottom: "1px solid #f0ebe0"
};

const price = {
  color: "#c8a84b",
  fontWeight: "900"
};

const label = {
  fontSize: 12,
  color: "#8a7d6b"
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ddd3c0",
  fontSize: 13
};

const updateBtn = {
  width: "100%",
  background: "#1a3a2a",
  color: "white",
  padding: 12,
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer"
};

const logoutBtn = {
  width: "100%",
  background: "#c0392b",
  color: "white",
  padding: 14,
  border: "none",
  borderRadius: 12,
  fontWeight: "bold",
  cursor: "pointer"
};