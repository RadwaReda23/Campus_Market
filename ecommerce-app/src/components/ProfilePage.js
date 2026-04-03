import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";

const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, image: "📚", views: 34 },
  { id: 2, title: "ميكروسكوب محمول", price: 320, image: "🔬", views: 87 },
  { id: 3, title: "كول روب معمل", price: 30, image: "🥼", views: 19 },
];

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
      }
    });
    return unsubscribe;
  }, []);

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { displayName: name });
      alert("تم تحديث البيانات ✅");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/Register"; // redirect to login/register page
  };

  return (
    <div style={container}>
      
      {/* Header */}
      <div style={header}>
        <div style={avatar}>{name ? name.charAt(0).toUpperCase() : "?"}</div>
        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{name || "No Name"}</div>
          <div style={role}>{email || ""}</div>
        </div>
      </div>

      {/* Products */}
      <div style={card}>
        <div style={title}>🛒 منتجاتي</div>
        {mockProducts.map(p => (
          <div key={p.id} style={row}>
            <span style={{ fontSize: 24 }}>{p.image}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#8a7d6b" }}>👁 {p.views} مشاهدة</div>
            </div>
            <div style={price}>{p.price} ج</div>
          </div>
        ))}
      </div>

      {/* Edit Profile */}
      <div style={card}>
        <div style={title}>⚙️ تعديل الحساب</div>
        <div style={{ padding: 16 }}>
          <label style={label}>الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />

          <label style={label}>الإيميل</label>
          <input
            type="email"
            value={email}
            readOnly
            style={input}
          />

          <button style={updateBtn} onClick={handleUpdate}>
            Update Profile
          </button>
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: 20 }}>
        <button style={logoutBtn} onClick={handleLogout}>
          🚪 تسجيل الخروج
        </button>
      </div>

    </div>
  );
}

/* ============== STYLES ============== */

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

const nameStyle = {
  fontSize: 20,
  fontWeight: "bold"
};

const role = {
  color: "#c8a84b",
  fontSize: 13,
  marginTop: 4
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
  color: "#8a7d6b",
  marginBottom: 5
};

const input = {
  width: "100%",
  padding: 10,
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