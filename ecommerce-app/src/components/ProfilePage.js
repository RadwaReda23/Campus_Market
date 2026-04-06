import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

const mockProducts = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, image: "📚", views: 34 },
  { id: 2, title: "ميكروسكوب محمول", price: 320, image: "🔬", views: 87 },
  { id: 3, title: "كول روب معمل", price: 30, image: "🥼", views: 19 },
];

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
        setPhotoURL(user.photoURL || null);
      }
    });
    return unsubscribe;
  }, []);

  // ✅ رفع الصورة على Cloudinary
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("من فضلك اختر صورة فقط");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();
      const url = data.secure_url;

      await updateProfile(auth.currentUser, { photoURL: url });
      setPhotoURL(url);
      alert("تم تحديث صورة البروفايل ✅");
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء رفع الصورة ❌");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { displayName: name });
      alert("تم تحديث البيانات ✅");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/Register";
  };

  return (
    <div style={container}>

      {/* Header */}
      <div style={header}>

        <div style={{ position: "relative", width: 70, height: 70 }}>
          {photoURL ? (
            <img src={photoURL} alt="profile" style={avatarImg} />
          ) : (
            <div style={avatar}>
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
          )}

          <button
            style={cameraBtn}
            onClick={() => fileInputRef.current.click()}
            title="تغيير الصورة"
            disabled={uploading}
          >
            {uploading ? "⏳" : "📷"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{name || "No Name"}</div>
          <div style={role}>{email || ""}</div>
          {uploading && (
            <div style={{ color: "#c8a84b", fontSize: 12, marginTop: 4 }}>
              جاري رفع الصورة...
            </div>
          )}
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

const avatarImg = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #c8a84b"
};

const cameraBtn = {
  position: "absolute",
  bottom: 0,
  left: 0,
  background: "#c8a84b",
  border: "none",
  borderRadius: "50%",
  width: 26,
  height: 26,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
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