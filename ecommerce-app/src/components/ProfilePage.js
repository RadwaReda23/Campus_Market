import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  collection, getDocs, query, where,
  doc, getDoc, updateDoc, addDoc, orderBy,
} from "firebase/firestore";

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

const COLORS = {
  primary: "#1a3a2a",
  accent: "#c8a84b",
  light: "#f5f0e8",
  white: "#ffffff",
  muted: "#8a7d6b",
  danger: "#c0392b",
  success: "#27ae60",
  border: "#ddd3c0",
  cardBg: "#fffdf8",
};

// ─── Star Rating Component ──────────────────────────────────────────────────────
function StarRating({ value, max = 5, size = 20, interactive = false, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;

  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span
          key={star}
          style={{
            fontSize: size,
            cursor: interactive ? "pointer" : "default",
            color: star <= display ? "#f59e0b" : "#d1d5db",
            transition: "color 0.15s",
          }}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange && onChange(star)}
        >★</span>
      ))}
    </div>
  );
}

// ─── Rate Seller Modal ──────────────────────────────────────────────────────────
function RateModal({ targetUser, onClose, currentUser }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) { alert("اختر عدد النجوم أولاً"); return; }
    setLoading(true);
    try {
      // إضافة التقييم في ratings collection
      await addDoc(collection(db, "ratings"), {
        raterId: currentUser.uid,
        raterName: currentUser.displayName || currentUser.email,
        ratedUserId: targetUser.uid,
        score,
        comment,
        createdAt: new Date(),
      });

      // تحديث ratingSum و ratingCount في الـ user document
      const userRef = doc(db, "users", targetUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        await updateDoc(userRef, {
          ratingSum: (data.ratingSum || 0) + score,
          ratingCount: (data.ratingCount || 0) + 1,
        });
      }

      alert("شكراً على تقييمك ✅");
      onClose();
    } catch (err) {
      console.error(err);
      alert("حصل خطأ ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        width: "100%", maxWidth: 380, direction: "rtl",
        fontFamily: "'Cairo', sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: COLORS.primary, fontSize: 16 }}>⭐ تقييم {targetUser.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: COLORS.muted }}>✕</button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>كيف كانت تجربتك معه؟</p>
          <StarRating value={score} size={36} interactive onChange={setScore} />
          <p style={{ marginTop: 8, fontSize: 12, color: COLORS.accent, fontWeight: 700 }}>
            {score === 0 ? "" : score === 1 ? "ضعيف" : score === 2 ? "مقبول" : score === 3 ? "جيد" : score === 4 ? "جيد جداً" : "ممتاز"}
          </p>
        </div>

        <textarea
          placeholder="اكتب تعليقك (اختياري)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.border}`,
            borderRadius: 8, fontSize: 13, fontFamily: "'Cairo', sans-serif",
            outline: "none", resize: "vertical", minHeight: 80, direction: "rtl",
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || score === 0}
          style={{
            width: "100%", marginTop: 16, padding: "12px",
            background: loading || score === 0 ? COLORS.muted : COLORS.primary,
            color: "white", border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading || score === 0 ? "not-allowed" : "pointer",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {loading ? "جاري الإرسال..." : "✅ إرسال التقييم"}
        </button>
      </div>
    </div>
  );
}

// ─── ProfilePage ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [activeProducts, setActiveProducts] = useState(0);
  const [soldProducts, setSoldProducts] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setEditName(user.displayName || "");

      try {
        // جيب بيانات المستخدم من Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let firestoreData = {};
        if (userSnap.exists()) {
          firestoreData = userSnap.data();
          const sum = firestoreData.ratingSum || 0;
          const count = firestoreData.ratingCount || 0;
          setAvgRating(count > 0 ? (sum / count) : 0);
          setRatingCount(count);
        }
        setUserData({ ...firestoreData, uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL });

        // جيب منتجات المستخدم
        const q = query(collection(db, "products"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMyProducts(products);
        setActiveProducts(products.filter(p => p.status === "active").length);
        setSoldProducts(products.filter(p => p.status === "sold").length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      await updateProfile(auth.currentUser, { photoURL: data.secure_url });
      // تحديث Firestore
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: data.secure_url });
      setUserData(prev => ({ ...prev, photoURL: data.secure_url }));
      alert("تم تحديث الصورة ✅");
    } catch { alert("خطأ ❌"); }
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editName });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { displayName: editName });
      setUserData(prev => ({ ...prev, displayName: editName }));
      alert("تم تحديث الاسم ✅");
    } catch { alert("خطأ ❌"); }
    setSavingName(false);
  };

  const displayedProducts = myProducts.filter(p =>
    activeTab === "active" ? p.status === "active" : p.status === "sold"
  );

  const roleColors = {
    "طالب": { bg: "#dbeafe", color: "#1d4ed8" },
    "دكتور": { bg: "#fce7f3", color: "#be185d" },
    "خريج": { bg: "#dcfce7", color: "#15803d" },
    "موظف": { bg: "#fef3c7", color: "#b45309" },
    "عامل": { bg: "#f3e8ff", color: "#7c3aed" },
  };
  const roleStyle = roleColors[userData?.role] || { bg: COLORS.light, color: COLORS.muted };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, fontFamily: "'Cairo', sans-serif" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
        جاري تحميل الملف الشخصي...
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", fontFamily: "'Cairo', sans-serif", maxWidth: 900, margin: "0 auto" }}>

      {/* ─── Profile Header Card ─── */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #2d5a3d 100%)`,
        borderRadius: 20, padding: "32px 28px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 24,
        boxShadow: "0 8px 32px rgba(26,58,42,0.25)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circle */}
        <div style={{ position: "absolute", top: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(200,168,75,0.08)" }} />
        <div style={{ position: "absolute", bottom: -60, left: 80, width: 160, height: 160, borderRadius: "50%", background: "rgba(200,168,75,0.05)" }} />

        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {userData?.photoURL ? (
            <img src={userData.photoURL} alt="avatar"
              style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: `3px solid ${COLORS.accent}`, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }} />
          ) : (
            <div style={{
              width: 90, height: 90, borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.accent}, #e6c060)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 34, fontWeight: 700, color: COLORS.primary,
              border: `3px solid ${COLORS.accent}`, boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}>
              {userData?.displayName?.[0]?.toUpperCase() || "؟"}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            style={{
              position: "absolute", bottom: 0, left: 0,
              width: 28, height: 28, borderRadius: "50%",
              background: COLORS.accent, color: COLORS.primary,
              border: "2px solid white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, transition: "transform 0.2s",
            }}
            title="تغيير الصورة"
          >📷</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
            {userData?.displayName || "مستخدم"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{
              background: roleStyle.bg, color: roleStyle.color,
              fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            }}>
              {userData?.role || "طالب"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              {userData?.email}
            </span>
          </div>

          {/* Stats Row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {/* Rating */}
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <StarRating value={Math.round(avgRating)} size={16} />
                <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 18 }}>
                  {ratingCount > 0 ? avgRating.toFixed(1) : "—"}
                </span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                {ratingCount > 0 ? `${ratingCount} تقييم` : "لا يوجد تقييم بعد"}
              </div>
            </div>

            <div style={{ width: 1, background: "rgba(255,255,255,0.15)" }} />

            {/* Active Products */}
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontWeight: 900, fontSize: 24 }}>{activeProducts}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>منتج معروض</div>
            </div>

            <div style={{ width: 1, background: "rgba(255,255,255,0.15)" }} />

            {/* Sold Products */}
            <div style={{ textAlign: "center" }}>
              <div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 24 }}>{soldProducts}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>صفقة مكتملة</div>
            </div>
          </div>
        </div>

        {/* Rate Button (للمستخدمين الآخرين - مشروط) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setShowRateModal(true)}
            style={{
              padding: "10px 18px", borderRadius: 10,
              background: COLORS.accent, color: COLORS.primary,
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              fontFamily: "'Cairo', sans-serif",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >⭐ أضف تقييم</button>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ─── My Products ─── */}
        <div style={{ background: "white", borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>🛒 منتجاتي</span>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "active", label: `معروض (${activeProducts})` },
                { key: "sold", label: `مُباع (${soldProducts})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, fontFamily: "'Cairo', sans-serif",
                  background: activeTab === tab.key ? COLORS.primary : COLORS.light,
                  color: activeTab === tab.key ? "white" : COLORS.muted,
                  transition: "all 0.2s",
                }}>{tab.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: 16, maxHeight: 380, overflowY: "auto" }}>
            {displayedProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: COLORS.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{activeTab === "active" ? "📦" : "🏷️"}</div>
                <div style={{ fontSize: 13 }}>
                  {activeTab === "active" ? "مفيش منتجات معروضة" : "مفيش منتجات مُباعة"}
                </div>
              </div>
            ) : (
              displayedProducts.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0", borderBottom: `1px solid ${COLORS.light}`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, overflow: "hidden",
                    background: COLORS.light, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    {p.imageURL
                      ? <img src={p.imageURL} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 22 }}>{p.image || "📦"}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                      👁 {p.views || 0} مشاهدة · {p.category}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent }}>{p.price} ج</div>
                    <div style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 10, marginTop: 3,
                      background: p.status === "active" ? "#d4f4e0" : "#fde8e8",
                      color: p.status === "active" ? COLORS.success : COLORS.danger,
                    }}>
                      {p.status === "active" ? "متاح" : "مُباع"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Edit Account ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Edit Name */}
          <div style={{ background: "white", borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>⚙️ إعدادات الحساب</span>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
                👤 الاسم
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    flex: 1, padding: "9px 12px", border: `1px solid ${COLORS.border}`,
                    borderRadius: 8, fontSize: 13, fontFamily: "'Cairo', sans-serif",
                    outline: "none", color: COLORS.primary, direction: "rtl",
                  }}
                  placeholder="اكتب اسمك هنا"
                />
                <button onClick={handleSaveName} disabled={savingName} style={{
                  padding: "9px 16px", background: COLORS.primary, color: "white",
                  border: "none", borderRadius: 8, cursor: savingName ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "'Cairo', sans-serif",
                  opacity: savingName ? 0.7 : 1,
                }}>
                  {savingName ? "..." : "حفظ"}
                </button>
              </div>

              <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, display: "block", marginBottom: 6, marginTop: 16 }}>
                📧 الإيميل
              </label>
              <input
                value={userData?.email || ""}
                readOnly
                style={{
                  width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, fontSize: 13, fontFamily: "'Cairo', sans-serif",
                  background: COLORS.light, color: COLORS.muted, direction: "ltr",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </div>

          {/* Rating Summary Card */}
          <div style={{ background: "white", borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>⭐ تقييماتي</span>
            </div>
            <div style={{ padding: 20 }}>
              {ratingCount === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: COLORS.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🌟</div>
                  <div style={{ fontSize: 13 }}>لا يوجد تقييمات بعد</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>ابدأ البيع وهتلاقي تقييمات هنا!</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.primary, lineHeight: 1 }}>
                        {avgRating.toFixed(1)}
                      </div>
                      <StarRating value={Math.round(avgRating)} size={20} />
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                        من {ratingCount} تقييم
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const pct = ratingCount > 0 ? Math.round((star / 5) * 100) : 0;
                        return (
                          <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: COLORS.muted, width: 12 }}>{star}</span>
                            <span style={{ color: "#f59e0b", fontSize: 12 }}>★</span>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: COLORS.light, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rate Modal */}
      {showRateModal && (
        <RateModal
          targetUser={{ uid: auth.currentUser?.uid, name: userData?.displayName || "المستخدم" }}
          currentUser={auth.currentUser}
          onClose={() => setShowRateModal(false)}
        />
      )}
    </div>
  );
}