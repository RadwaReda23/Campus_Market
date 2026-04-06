import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [myProducts, setMyProducts] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
        setPhotoURL(user.photoURL || null);

        // ✅ هات منتجات المستخدم الحالي
        const q = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMyProducts(data);
      }
    });

    return unsubscribe;
  }, []);

  // رفع صورة
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();

      await updateProfile(auth.currentUser, {
        photoURL: data.secure_url,
      });

      setPhotoURL(data.secure_url);
      alert("تم تحديث الصورة ✅");
    } catch {
      alert("خطأ ❌");
    }
    setUploading(false);
  };

  const handleUpdate = async () => {
    await updateProfile(auth.currentUser, {
      displayName: name,
    });
    alert("تم التحديث ✅");
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/Register";
  };

  return (
    <div style={container}>
      {/* HEADER */}
      <div style={header}>
        <div style={{ position: "relative" }}>
          {photoURL ? (
            <img src={photoURL} style={avatarImg} />
          ) : (
            <div style={avatar}>
              {name ? name[0].toUpperCase() : "?"}
            </div>
          )}

          <button
            style={cameraBtn}
            onClick={() => fileInputRef.current.click()}
          >
            📷
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        </div>

        <div>
          <div style={nameStyle}>{name}</div>
          <div style={role}>{email}</div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div style={card}>
        <div style={title}>🛒 منتجاتي</div>

        {myProducts.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            مفيش منتجات 😢
          </div>
        ) : (
          myProducts.map((p) => (
            <div key={p.id} style={row}>
              {p.imageURL ? (
                <img src={p.imageURL} style={productImg} />
              ) : (
                <span>📦</span>
              )}

              <div style={{ flex: 1 }}>
                <div>{p.title}</div>
                <div style={{ fontSize: 12 }}>
                  👁 {p.views}
                </div>
              </div>

              <div>{p.price} ج</div>
            </div>
          ))
        )}
      </div>

      {/* EDIT */}
      <div style={card}>
        <div style={title}>⚙️ تعديل الحساب</div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />

        <input value={email} readOnly style={input} />

        <button onClick={handleUpdate} style={btn}>
          Update
        </button>
      </div>

      {/* LOGOUT */}
      <button onClick={handleLogout} style={logout}>
        تسجيل خروج
      </button>
    </div>
  );
}

/* ================== STYLES ================== */

const container = {
  background: "#f5f0e8",
  minHeight: "100vh",
  direction: "rtl",
};

const header = {
  background: "#1a3a2a",
  padding: 30,
  display: "flex",
  gap: 20,
  color: "white",
};

const avatar = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  background: "#c8a84b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
};

const avatarImg = {
  width: 70,
  height: 70,
  borderRadius: "50%",
};

const cameraBtn = {
  position: "absolute",
  bottom: 0,
  left: 0,
};

const nameStyle = { fontSize: 18 };
const role = { fontSize: 12 };

const card = {
  background: "white",
  margin: 16,
  padding: 16,
};

const title = { fontWeight: "bold" };

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
};

const productImg = {
  width: 40,
  height: 40,
  borderRadius: 8,
};

const input = {
  width: "100%",
  marginTop: 10,
  padding: 10,
};

const btn = {
  marginTop: 10,
  padding: 10,
  background: "#1a3a2a",
  color: "white",
};

const logout = {
  margin: 20,
  padding: 10,
  background: "red",
  color: "white",
};