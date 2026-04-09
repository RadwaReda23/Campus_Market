import { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore";

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

// ─── Modal إضافة عنصر للمكتبة ──────────────────────────────────────────────────
function AddLibraryModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: "", category: "ملابس" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const categories = ["ملابس", "معدات", "كتب", "أدوات", "أخرى"];
  const emojiMap = { ملابس: "🥼", معدات: "🔬", كتب: "📚", أدوات: "🔧", أخرى: "📦" };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("من فضلك اختر صورة فقط");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title) { alert("من فضلك ادخل اسم العنصر"); return; }
    setLoading(true);
    try {
      let imageURL = "";

      // رفع الصورة على Cloudinary لو في صورة
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        imageURL = data.secure_url;
      }

      const item = {
        title: form.title,
        category: form.category,
        image: imageURL || emojiMap[form.category] || "📦",
        imageURL: imageURL,
        available: true,
        borrower: null,
        addedBy: auth.currentUser?.displayName || auth.currentUser?.email || "مجهول",
        addedById: auth.currentUser?.uid,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "library"), item);
      onAdd({ id: docRef.id, ...item });
      onClose();
      alert("تم إضافة العنصر ✅");
    } catch (err) {
      console.error(err);
      alert("حصل خطأ ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: COLORS.primary, fontSize: 16 }}>📚 إضافة عنصر للمكتبة</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* صورة العنصر */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            onClick={() => fileRef.current.click()}
            style={imagePicker}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
            ) : (
              <div>
                <div style={{ fontSize: 28 }}>📷</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>اضغط لإضافة صورة</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={handleImageChange} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>اسم العنصر *</label>
          <input style={inputStyle} placeholder="مثال: بالطو معمل مقاس L"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>الفئة</label>
          <select style={inputStyle} value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={submitBtn(loading)}>
          {loading ? "جاري الإضافة..." : "✅ إضافة العنصر"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal إضافة مفقود ─────────────────────────────────────────────────────────
function AddLostModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("من فضلك اختر صورة فقط");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.location) { alert("من فضلك ادخل الاسم والمكان"); return; }
    setLoading(true);
    try {
      let imageURL = "";

      // رفع الصورة على Cloudinary لو في صورة
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        imageURL = data.secure_url;
      }

      const item = {
        title: form.title,
        description: form.description,
        location: form.location,
        finder: auth.currentUser?.displayName || auth.currentUser?.email || "مجهول",
        finderId: auth.currentUser?.uid,
        image: imageURL ? "" : "🔍",
        imageURL: imageURL,
        claimed: false,
        date: "الآن",
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "lostFound"), item);
      onAdd({ id: docRef.id, ...item });
      onClose();
      alert("تم إضافة المفقود ✅");
    } catch (err) {
      console.error(err);
      alert("حصل خطأ ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: COLORS.primary, fontSize: 16 }}>🔍 إضافة مفقود</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* صورة المفقود */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            onClick={() => fileRef.current.click()}
            style={imagePicker}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
            ) : (
              <div>
                <div style={{ fontSize: 28 }}>📷</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>اضغط لإضافة صورة</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={handleImageChange} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>اسم الشيء المفقود *</label>
          <input style={inputStyle} placeholder="مثال: محفظة جلد بنية"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>وصف</label>
          <input style={inputStyle} placeholder="مثال: وُجدت بالقرب من قاعة 101"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>المكان *</label>
          <input style={inputStyle} placeholder="مثال: مبنى A"
            value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={submitBtn(loading)}>
          {loading ? "جاري الإضافة..." : "✅ إضافة المفقود"}
        </button>
      </div>
    </div>
  );
}

// ─── LibraryPage ───────────────────────────────────────────────────────────────
export default function LibraryPage({ onStartChat }) {
  const [activeLibraryTab, setActiveLibraryTab] = useState("borrow");

  // Library state
  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Lost & Found state
  const [lostItems, setLostItems] = useState([]);
  const [loadingLost, setLoadingLost] = useState(true);
  const [showLostModal, setShowLostModal] = useState(false);

  // جيب عناصر المكتبة من Firestore
  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "library"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoadingLibrary(false); }
    };
    fetch();
  }, []);

  // جيب المفقودات من Firestore
  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "lostFound"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setLostItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoadingLost(false); }
    };
    fetch();
  }, []);

  // تغيير حالة العنصر التدويرية (متاح/مستعار) من قِبل المالك
  const handleToggleAvailability = async (item) => {
    try {
      if (item.available) {
        if(!window.confirm("تحويل العنصر لـ مستعار؟ (إخفاءه من المتاح)")) return;
        await updateDoc(doc(db, "library", item.id), {
          available: false,
          borrower: "مجهول (خارج التطبيق)",
          borrowerId: "manual",
        });
        setLibraryItems(prev => prev.map(i =>
          i.id === item.id
            ? { ...i, available: false, borrower: "مجهول (خارج التطبيق)", borrowerId: "manual" }
            : i
        ));
      } else {
        if(!window.confirm("هل تأكدت من استلام العنصر وجعله متاحاً من جديد؟")) return;
        await updateDoc(doc(db, "library", item.id), {
          available: true,
          borrower: null,
          borrowerId: null,
          returnDate: null,
          durationType: null
        });
        setLibraryItems(prev => prev.map(i =>
          i.id === item.id
            ? { ...i, available: true, borrower: null, borrowerId: null, returnDate: null, durationType: null }
            : i
        ));
      }
    } catch (err) { console.error(err); alert("حصل خطأ ❌"); }
  };

  // ✅ تغيير حالة المفقود (مسترد/مفقود) - للمكتشف فقط
  const handleToggleClaimed = async (item) => {
    try {
      const newStatus = !item.claimed;
      const confirmMsg = newStatus 
        ? "هل تم استرداد هذا المفقود بالفعل؟" 
        : "إعادة الحالة إلى 'مفقود'؟";
        
      if (!window.confirm(confirmMsg)) return;

      await updateDoc(doc(db, "lostFound", item.id), { claimed: newStatus });
      setLostItems(prev => prev.map(i => i.id === item.id ? { ...i, claimed: newStatus } : i));
    } catch (err) {
      console.error(err);
      alert("حصل خطأ ❌");
    }
  };

  return (
    <>
      {showLibraryModal && (
        <AddLibraryModal
          onClose={() => setShowLibraryModal(false)}
          onAdd={(item) => setLibraryItems(prev => [item, ...prev])}
        />
      )}
      {showLostModal && (
        <AddLostModal
          onClose={() => setShowLostModal(false)}
          onAdd={(item) => setLostItems(prev => [item, ...prev])}
        />
      )}

      <div className="alert-strip" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
        <span>📚</span>
        <span>المكتبة مكان للاستعارة <strong>المجانية</strong> — يُرجى إعادة العناصر بعد الاستخدام</span>
      </div>

      <div className="library-tabs">
        <button className={`lib-tab ${activeLibraryTab === "borrow" ? "active" : ""}`}
          onClick={() => setActiveLibraryTab("borrow")}>
          🥼 الاستعارة
        </button>
        <button className={`lib-tab ${activeLibraryTab === "lostfound" ? "active" : ""}`}
          onClick={() => setActiveLibraryTab("lostfound")}>
          🔍 المفقودات
        </button>
      </div>

      {/* ─── تاب الاستعارة ─── */}
      {activeLibraryTab === "borrow" && (
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">🥼 عناصر الاستعارة المجانية</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: COLORS.muted }}>
                {libraryItems.filter(l => l.available).length} متاح من أصل {libraryItems.length}
              </span>
              <button className="add-btn" style={{ fontSize: 12, padding: "7px 14px" }}
                onClick={() => setShowLibraryModal(true)}>
                + إضافة عنصر
              </button>
            </div>
          </div>
          <div className="section-body">
            {loadingLibrary ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.muted }}>جاري التحميل...</div>
            ) : libraryItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.muted }}>لا توجد عناصر — أضف أول عنصر!</div>
            ) : (
              <div className="products-grid">
                {libraryItems.map(item => (
                  <div key={item.id} className="product-card">
                    <div className="product-image">
                      {item.imageURL ? (
                        <img src={item.imageURL} alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>{item.image || "📦"}</span>
                      )}
                      <span className={`product-badge ${item.available ? "badge-active" : "badge-sold"}`}>
                        {item.available ? "متاح للاستعارة" : "مستعار"}
                      </span>
                    </div>
                    <div className="product-info">
                      <div className="product-title">{item.title}</div>
                      <div className={`lib-status ${item.available ? "available" : "unavailable"}`} style={{ fontSize: 11, marginBottom: 8 }}>
                        {item.available ? "متاح" : `مستعار بواسطة: ${item.borrower}`}
                      </div>
                      <div className="product-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                        <div>
                          <div className="product-seller">{item.addedBy || "مكتبة الكلية"}</div>
                          <span className="seller-type type-student" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>عضو</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {auth.currentUser?.uid === item.addedById ? (
                            <button
                              className="borrow-btn"
                              onClick={() => handleToggleAvailability(item)}
                              style={{ 
                                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", 
                                fontFamily: "'Cairo', sans-serif", fontSize: 10, fontWeight: 700, 
                                background: item.available ? COLORS.danger : COLORS.success, color: "white" 
                              }}
                            >
                              {item.available ? "🔴 تحويل لمستعار" : "✅ إنهاء الاستعارة"}
                            </button>
                          ) : null}
                          {auth.currentUser?.uid !== item.addedById && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onStartChat && onStartChat({
                                id: item.id,
                                title: item.title,
                                sellerId: item.addedById || "unknown",
                                seller: item.addedBy || "مجهول",
                                isLibrary: true
                              });}}
                              style={{
                                padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                                background: COLORS.primary, color: "white", fontSize: 11, fontFamily: "'Cairo', sans-serif",
                                cursor: "pointer", fontWeight: 700
                              }}>
                              💬 تواصل
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── تاب المفقودات ─── */}
      {activeLibraryTab === "lostfound" && (
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">🔍 المفقودات في الكلية</span>
            <button className="add-btn" style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => setShowLostModal(true)}>
              + إضافة مفقود
            </button>
          </div>
          <div className="section-body">
            {loadingLost ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.muted }}>جاري التحميل...</div>
            ) : lostItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.muted }}>لا توجد مفقودات</div>
            ) : (
              <div className="products-grid">
                {lostItems.map(item => (
                  <div key={item.id} className="product-card">
                    <div className="product-image">
                      {item.imageURL ? (
                        <img src={item.imageURL} alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>{item.image || "🔍"}</span>
                      )}
                      <span className={`product-badge ${!item.claimed ? "badge-active" : "badge-sold"}`}>
                        {item.claimed ? "تم الاسترداد" : "مفقود"}
                      </span>
                    </div>
                    <div className="product-info">
                      <div className="product-title">{item.title}</div>
                      <div className="lost-desc" style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8, height: 32, overflow: "hidden" }}>{item.description}</div>
                      <div className="lost-meta" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <span className="lost-tag" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: COLORS.light, color: COLORS.muted }}>👤 {item.finder}</span>
                        <span className="lost-tag" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: COLORS.light, color: COLORS.muted }}>📍 {item.location}</span>
                        <span className="lost-tag" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: COLORS.light, color: COLORS.muted }}>🕐 {item.date}</span>
                      </div>
                      <div className="product-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                        <div>
                          <div className="product-seller">{item.finder || "مجهول"}</div>
                          <span className="seller-type type-grad" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>باحث</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {auth.currentUser?.uid === item.finderId && (
                            <button
                              className="borrow-btn"
                              onClick={() => handleToggleClaimed(item)}
                              style={{ 
                                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", 
                                fontFamily: "'Cairo', sans-serif", fontSize: 11, fontWeight: 700,
                                background: item.claimed ? COLORS.success : COLORS.danger, color: "white"
                              }}
                            >
                              {item.claimed ? "✅ تم الاسترداد" : "🔴 تحديد كمُسترد"}
                            </button>
                          )}
                          {auth.currentUser?.uid !== item.finderId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onStartChat && onStartChat({
                                id: item.id,
                                title: item.title,
                                sellerId: item.finderId || "unknown",
                                seller: item.finder || "مجهول"
                              });}}
                              style={{
                                padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                                background: COLORS.primary, color: "white", fontSize: 11, fontFamily: "'Cairo', sans-serif",
                                cursor: "pointer", fontWeight: 700
                              }}>
                              💬 تواصل
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const modalOverlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 999, padding: 16,
};

const modalBox = {
  background: "white", borderRadius: 16,
  padding: 24, width: "100%", maxWidth: 420,
  direction: "rtl", fontFamily: "'Cairo', sans-serif",
};

const closeBtn = {
  background: "none", border: "none",
  fontSize: 18, cursor: "pointer", color: COLORS.muted,
};

const imagePicker = {
  width: 120, height: 120, borderRadius: 12,
  border: `2px dashed ${COLORS.border}`,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", margin: "0 auto", overflow: "hidden",
  background: COLORS.light,
};

const fieldGroup = { marginBottom: 14 };

const labelStyle = {
  display: "block", fontSize: 12,
  color: COLORS.muted, marginBottom: 5, fontWeight: 600,
};

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8, fontSize: 13,
  fontFamily: "'Cairo', sans-serif",
  outline: "none", color: COLORS.primary,
  background: "white",
};

const submitBtn = (loading) => ({
  width: "100%",
  background: loading ? COLORS.muted : COLORS.primary,
  color: "white", border: "none", borderRadius: 10,
  padding: "12px", fontSize: 14, fontWeight: 700,
  cursor: loading ? "not-allowed" : "pointer",
  fontFamily: "'Cairo', sans-serif", marginTop: 8,
});