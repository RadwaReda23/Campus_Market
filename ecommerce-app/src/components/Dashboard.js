import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, onSnapshot, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { COLORS, FONTS, mockMessages, navItems } from "../constants";
import HomePage from "./HomePage";
import LibraryPage from "./LibraryPage";
import ProfilePage from "./ProfilePage";
import ChatView from "./ChatView";

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

// ─── Search Hook ────────────────────────────────────────────────────────────────
function useSearch(searchQuery) {
  const [results, setResults] = useState({ products: [], library: [], lostFound: [] });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ products: [], library: [], lostFound: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const q = searchQuery.trim().toLowerCase();
      try {
        const [prodSnap, libSnap, lostSnap] = await Promise.all([
          getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "library"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "lostFound"), orderBy("createdAt", "desc"))),
        ]);

        const matchStr = (val) => val && String(val).toLowerCase().includes(q);

        const products = prodSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => matchStr(p.title) || matchStr(p.category) || matchStr(p.seller) || matchStr(p.condition))
          .slice(0, 5);

        const library = libSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(i => matchStr(i.title) || matchStr(i.category))
          .slice(0, 3);

        const lostFound = lostSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(i => matchStr(i.title) || matchStr(i.description) || matchStr(i.location))
          .slice(0, 3);

        setResults({ products, library, lostFound });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return { results, searching };
}

// ─── Add Product Modal ─────────────────────────────────────────────────────────
function AddProductModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    title: "", price: "", condition: "جيد", category: "كتب", sellerType: "طالب",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const conditions = ["ممتاز", "جيد جداً", "جيد", "مقبول"];
  const categories = ["كتب", "معدات", "ملابس", "أدوات", "أخرى"];
  const sellerTypes = ["طالب", "دكتور", "خريج", "موظف"];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price) {
      alert("من فضلك ادخل اسم المنتج والسعر");
      return;
    }

    setLoading(true);
    try {
      let imageURL = "";

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

      const product = {
        title: form.title,
        price: Number(form.price),
        condition: form.condition,
        category: form.category,
        sellerType: form.sellerType,
        seller: auth.currentUser?.displayName || auth.currentUser?.email || "مجهول",
        sellerId: auth.currentUser?.uid,
        imageURL: imageURL,
        image: imageURL ? "" : "📦",
        views: 0,
        status: "active",
        time: "الآن",
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "products"), product);
      onAdd({ id: docRef.id, ...product });
      onClose();
      alert("تم إضافة المنتج ✅");
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
          <h3 style={{ color: COLORS.primary, fontSize: 17 }}>➕ إضافة منتج جديد</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div onClick={() => fileRef.current.click()} style={imagePicker}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
            ) : (
              <div>
                <div style={{ fontSize: 32 }}>📷</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>اضغط لإضافة صورة</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={handleImageChange} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>اسم المنتج *</label>
          <input style={inputStyle} placeholder="مثال: كتاب الفيزياء العامة"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>السعر (جنيه) *</label>
          <input style={inputStyle} type="number" placeholder="0"
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>الحالة</label>
            <select style={inputStyle} value={form.condition}
              onChange={e => setForm({ ...form, condition: e.target.value })}>
              {conditions.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>الفئة</label>
            <select style={inputStyle} value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>نوع البائع</label>
          <select style={inputStyle} value={form.sellerType}
            onChange={e => setForm({ ...form, sellerType: e.target.value })}>
            {sellerTypes.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", background: loading ? COLORS.muted : COLORS.primary,
          color: "white", border: "none", borderRadius: 10,
          padding: "12px", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Cairo', sans-serif", marginTop: 8,
        }}>
          {loading ? "جاري الإضافة..." : "✅ إضافة المنتج"}
        </button>
      </div>
    </div>
  );
}

// ─── Add Lost Modal ────────────────────────────────────────────────────────────
function AddLostModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("من فضلك اختر صورة فقط"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.location) { alert("من فضلك ادخل الاسم والمكان"); return; }
    setLoading(true);
    try {
      let imageURL = "";

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

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div onClick={() => fileRef.current.click()} style={imagePicker}>
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

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", background: loading ? COLORS.muted : COLORS.primary,
          color: "white", border: "none", borderRadius: 10,
          padding: "12px", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Cairo', sans-serif", marginTop: 8,
        }}>
          {loading ? "جاري الإضافة..." : "✅ إضافة المفقود"}
        </button>
      </div>
    </div>
  );
}

// ─── Products Page ─────────────────────────────────────────────────────────────
function ProductsPage({ searchQuery = "", onStartChat }) {
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const filters = ["الكل", "كتب", "معدات", "ملابس", "أدوات", "أخرى"];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = products
    .filter(p => activeFilter === "الكل" || p.category === activeFilter)
    .filter(p => {
      if (!searchQuery || searchQuery.trim().length < 2) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.seller && p.seller.toLowerCase().includes(q)) ||
        (p.condition && p.condition.toLowerCase().includes(q))
      );
    });

  return (
    <>
      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onAdd={(newProduct) => setProducts(prev => [newProduct, ...prev])}
        />
      )}

      {searchQuery && searchQuery.trim().length >= 2 && (
        <div style={{
          background: "linear-gradient(135deg, #fffbf0, #fef9ec)",
          border: `1px solid ${COLORS.accent}44`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8, fontSize: 13,
        }}>
          <span>🔍</span>
          <span>نتائج البحث عن: <strong style={{ color: COLORS.primary }}>"{searchQuery}"</strong></span>
          <span style={{ color: COLORS.muted, marginRight: "auto" }}>{filtered.length} منتج</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          عرض <strong>{filtered.length}</strong> منتج
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <span>+</span> إضافة منتج
        </button>
      </div>

      <div className="filter-bar">
        {filters.map(f => (
          <button key={f}
            className={`filter-chip ${activeFilter === f ? "active" : ""}`}
            onClick={() => setActiveFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {loadingProducts ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>لا توجد منتجات</div>
      ) : (
        <div className="products-grid">
          {filtered.map(p => (
            <div key={p.id} className="product-card">
              <div className="product-image">
                {p.imageURL ? (
                  <img src={p.imageURL} alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{p.image || "📦"}</span>
                )}
                <span className={`product-badge ${p.status === "active" ? "badge-active" : "badge-sold"}`}>
                  {p.status === "active" ? "متاح" : "تم البيع"}
                </span>
              </div>
              <div className="product-info">
                <div className="product-title">{p.title}</div>
                <span className="condition-badge">الحالة: {p.condition}</span>
                <div className="product-price">{p.price} <span>جنيه</span></div>
                <div className="product-meta">
                  <div>
                    <div className="product-seller">{p.seller}</div>
                    <span className={`seller-type ${
                      p.sellerType === "طالب" ? "type-student" :
                      p.sellerType === "دكتور" ? "type-doctor" :
                      p.sellerType === "خريجة" || p.sellerType === "خريج" ? "type-grad" : "type-staff"
                    }`}>{p.sellerType}</span>
                  </div>
                  <div className="product-views">
                    {auth.currentUser?.uid !== p.sellerId ? (
                      <button onClick={(e) => { e.stopPropagation(); onStartChat(p); }} style={{
                        padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                        background: COLORS.primary, color: "white", fontSize: 11, fontFamily: "'Cairo', sans-serif",
                        cursor: "pointer", fontWeight: 700
                      }}>💬 تواصل</button>
                    ) : (
                      <span>👁 {p.views}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Lost & Found Page ─────────────────────────────────────────────────────────
function LostFoundPage({ onStartChat }) {
  const [lostItems, setLostItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // ✅ جيب المفقودات من Firestore
  useEffect(() => {
    const fetchLost = async () => {
      try {
        const q = query(collection(db, "lostFound"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setLostItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLost();
  }, []);

  // ✅ المطالبة بمفقود وتحديث Firestore
  const handleClaim = async (item) => {
    try {
      await updateDoc(doc(db, "lostFound", item.id), { claimed: true });
      setLostItems(prev => prev.map(i => i.id === item.id ? { ...i, claimed: true } : i));
    } catch (err) {
      console.error(err);
      alert("حصل خطأ ❌");
    }
  };

  return (
    <>
      {showModal && (
        <AddLostModal
          onClose={() => setShowModal(false)}
          onAdd={(item) => setLostItems(prev => [item, ...prev])}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ color: COLORS.muted, fontSize: 13 }}>لقيت حاجة في الكلية؟ سجلها هنا وساعد صاحبها يلاقيها</p>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ إضافة مفقود</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>جاري التحميل...</div>
      ) : lostItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>لا توجد مفقودات</div>
      ) : (
        lostItems.map(item => (
          <div key={item.id} className="lost-item" style={{ marginBottom: 12 }}>
            {item.imageURL ? (
              <img src={item.imageURL} alt={item.title}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <span className="lost-emoji" style={{ fontSize: 40 }}>{item.image}</span>
            )}
            <div className="lost-info">
              <div className="lost-title" style={{ fontSize: 15 }}>{item.title}</div>
              <div className="lost-desc">{item.description}</div>
              <div className="lost-meta">
                <span className="lost-tag">👤 {item.finder}</span>
                <span className="lost-tag">📍 {item.location}</span>
                <span className="lost-tag">🕐 {item.date}</span>
                {item.claimed && <span className="lost-tag claimed-badge">✅ تم الاسترداد</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              <button
                className={`borrow-btn ${!item.claimed ? "btn-primary" : "btn-disabled"}`}
                disabled={item.claimed}
                onClick={() => !item.claimed && handleClaim(item)}
              >
                {item.claimed ? "مُسترد" : "هذا ملكي 🙋"}
              </button>
              {item.finderId && auth.currentUser?.uid !== item.finderId && (
                <button
                  onClick={() => onStartChat({
                    id: item.id,
                    title: item.title,
                    sellerId: item.finderId,
                    seller: item.finder
                  })}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                    background: "white", fontSize: 12, fontFamily: "'Cairo', sans-serif",
                    cursor: "pointer", color: COLORS.primary, fontWeight: 600
                  }}>
                  💬 تواصل
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ─── Messages Page ─────────────────────────────────────────────────────────────

function MessagesPage({ onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", auth.currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = conversations.filter(c => c.unreadCount?.[auth.currentUser?.uid] > 0).length;

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button className="filter-chip active">الكل</button>
        <button className="filter-chip">غير مقروءة ({unreadCount})</button>
      </div>

      {loading ? (
         <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>جاري التحميل...</div>
      ) : conversations.length === 0 ? (
         <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            لا توجد محادثات حتى الآن
         </div>
      ) : (
        conversations.map(conv => {
          const isUnread = conv.unreadCount?.[auth.currentUser?.uid] > 0;
          const otherUserId = conv.participants.find(id => id !== auth.currentUser?.uid);
          const otherUserName = conv.participantNames?.[otherUserId] || "مستخدم";

          return (
            <div 
              key={conv.id} 
              className={`message-item ${isUnread ? "unread" : ""}`}
              onClick={() => onOpenChat({ conversationId: conv.id, ...conv })}
            >
              <div className="msg-avatar">{otherUserName[0].toUpperCase()}</div>
              <div className="msg-info">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="msg-from">{otherUserName}</span>
                  {isUnread && (
                    <span style={{ background: COLORS.danger, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{conv.unreadCount[auth.currentUser.uid]} جديد</span>
                  )}
                </div>
                <div className="msg-product">بخصوص: {conv.productTitle}</div>
                <div className="msg-text">{conv.lastMessage || "بدأت المحادثة"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <span className="msg-time">
                  {conv.lastMessageTime?.toDate().toLocaleDateString("ar-EG") || ""}
                </span>
                <button className="borrow-btn btn-primary">فتح</button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const modalOverlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 999, padding: 16,
};

const modalBox = {
  background: "white", borderRadius: 16,
  padding: 24, width: "100%", maxWidth: 460,
  maxHeight: "90vh", overflowY: "auto",
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

// ─── Dashboard Shell ───────────────────────────────────────────────────────────
export default function Dashboard({ user }) {
  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const { results, searching } = useSearch(searchQuery);
  const totalResults = results.products.length + results.library.length + results.lostFound.length;

  // Real-time unread messages count for topbar
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount?.[auth.currentUser.uid] > 0) {
          count += data.unreadCount[auth.currentUser.uid];
        }
      });
      setGlobalUnreadCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const avatarLetter = user?.displayName
    ? user.displayName[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "م";

  const handleSearchResultClick = (page) => {
    setActivePage(page);
    setSearchQuery("");
    setShowSearchDropdown(false);
  };

  const startChat = (productData) => {
    setCurrentChat({
      productId: productData.id,
      productTitle: productData.title,
      sellerId: productData.sellerId,
      sellerName: productData.seller,
      buyerId: auth.currentUser?.uid,
      buyerName: auth.currentUser?.displayName || auth.currentUser?.email
    });
    setActivePage("chat");
  };

  const openExistingChat = (convData) => {
    const isBuyer = auth.currentUser.uid !== convData.participants[1];
    setCurrentChat({
      conversationId: convData.id,
      productId: convData.productId,
      productTitle: convData.productTitle,
      sellerId: convData.participants[1], 
      buyerId: convData.participants[0],
      participantNames: convData.participantNames
    });
    setActivePage("chat");
  };

  const pageMap = {
    home: <HomePage setActivePage={setActivePage} />,
    products: <ProductsPage searchQuery={searchQuery} onStartChat={startChat} />,
    library: <LibraryPage onStartChat={startChat} />,
    lostfound: <LostFoundPage onStartChat={startChat} />,
    messages: <MessagesPage onOpenChat={openExistingChat} />,
    profile: <ProfilePage />,
    chat: <ChatView chatData={currentChat} onBack={() => setActivePage("messages")} />
  };

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; background: ${COLORS.light}; color: ${COLORS.primary}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.light}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.accent}; border-radius: 3px; }
        .app { display: flex; min-height: 100vh; }
        .sidebar {
          width: ${sidebarOpen ? "240px" : "68px"};
          background: ${COLORS.primary}; transition: width 0.3s ease;
          display: flex; flex-direction: column;
          position: fixed; top: 0; right: 0;
          height: 100vh; z-index: 100;
          box-shadow: -4px 0 20px rgba(0,0,0,0.15); overflow: hidden;
        }
        .sidebar-logo { padding: 20px 16px; border-bottom: 1px solid rgba(200,168,75,0.3); display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 40px; height: 40px; background: ${COLORS.accent}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .logo-text { color: white; overflow: hidden; white-space: nowrap; }
        .logo-text h3 { font-size: 13px; font-weight: 700; line-height: 1.3; }
        .logo-text span { font-size: 11px; color: ${COLORS.accent}; font-family: 'Amiri', serif; }
        .nav-items { flex: 1; padding: 16px 8px; display: flex; flex-direction: column; gap: 4px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.7); transition: all 0.2s; white-space: nowrap; }
        .nav-item:hover { background: rgba(200,168,75,0.15); color: white; }
        .nav-item.active { background: ${COLORS.accent}; color: ${COLORS.primary}; font-weight: 700; }
        .nav-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
        .nav-label { font-size: 13px; overflow: hidden; }
        .badge { background: ${COLORS.danger}; color: white; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: auto; flex-shrink: 0; }
        .sidebar-toggle { padding: 16px; border-top: 1px solid rgba(200,168,75,0.2); }
        .toggle-btn { background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: background 0.2s; }
        .toggle-btn:hover { background: rgba(200,168,75,0.3); }
        .main { margin-right: ${sidebarOpen ? "240px" : "68px"}; flex: 1; transition: margin-right 0.3s ease; min-height: 100vh; display: flex; flex-direction: column; }
        .topbar { background: white; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${COLORS.border}; position: sticky; top: 0; z-index: 50; }
        .page-title { font-size: 20px; font-weight: 700; color: ${COLORS.primary}; }
        .topbar-actions { display: flex; align-items: center; gap: 16px; }
        .search-box { display: flex; align-items: center; gap: 8px; background: ${COLORS.light}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 8px 14px; transition: border-color 0.2s; }
        .search-box:focus-within { border-color: ${COLORS.accent}; }
        .search-box input { border: none; background: transparent; font-family: 'Cairo', sans-serif; font-size: 13px; outline: none; width: 260px; direction: rtl; color: ${COLORS.primary}; }
        .search-box input::placeholder { color: ${COLORS.muted}; }
        .avatar { width: 36px; height: 36px; background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent}); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; cursor: pointer; }
        .content { padding: 28px; flex: 1; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid ${COLORS.border}; display: flex; align-items: center; gap: 16px; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
        .stat-info h2 { font-size: 26px; font-weight: 900; color: ${COLORS.primary}; }
        .stat-info p { font-size: 12px; color: ${COLORS.muted}; margin-top: 2px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .section-card { background: white; border-radius: 16px; border: 1px solid ${COLORS.border}; overflow: hidden; }
        .section-header { padding: 16px 20px; border-bottom: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: space-between; }
        .section-title { font-size: 15px; font-weight: 700; color: ${COLORS.primary}; display: flex; align-items: center; gap: 8px; }
        .section-link { font-size: 12px; color: ${COLORS.accent}; cursor: pointer; font-weight: 600; }
        .section-body { padding: 16px 20px; }
        .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .product-card { background: ${COLORS.cardBg}; border-radius: 14px; border: 1px solid ${COLORS.border}; overflow: hidden; transition: all 0.25s; cursor: pointer; }
        .product-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(26,58,42,0.12); border-color: ${COLORS.accent}; }
        .product-image { height: 200px; background: linear-gradient(135deg, ${COLORS.light}, #e8dfc8); display: flex; align-items: center; justify-content: center; font-size: 48px; position: relative; overflow: hidden; }
        .product-badge { position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .badge-active { background: #d4f4e0; color: ${COLORS.success}; }
        .badge-sold { background: #fde8e8; color: ${COLORS.danger}; }
        .product-info { padding: 12px; }
        .product-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; line-height: 1.4; }
        .product-price { font-size: 17px; font-weight: 900; color: ${COLORS.accent}; }
        .product-price span { font-size: 12px; font-weight: 400; color: ${COLORS.muted}; }
        .product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .product-seller { font-size: 11px; color: ${COLORS.muted}; }
        .product-views { font-size: 11px; color: ${COLORS.muted}; display: flex; align-items: center; gap: 3px; }
        .condition-badge { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: ${COLORS.light}; color: ${COLORS.muted}; margin-top: 4px; display: inline-block; }
        .library-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .lib-tab { padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600; border: 2px solid ${COLORS.border}; background: white; color: ${COLORS.muted}; transition: all 0.2s; }
        .lib-tab.active { background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary}; }
        .lib-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid ${COLORS.border}; margin-bottom: 8px; background: ${COLORS.cardBg}; transition: all 0.2s; }
        .lib-item:hover { border-color: ${COLORS.accent}; }
        .lib-emoji { font-size: 24px; }
        .lib-info { flex: 1; }
        .lib-title { font-size: 13px; font-weight: 700; }
        .lib-status { font-size: 11px; margin-top: 2px; }
        .available { color: ${COLORS.success}; }
        .unavailable { color: ${COLORS.danger}; }
        .borrow-btn { padding: 6px 14px; border-radius: 8px; border: none; font-family: 'Cairo', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: ${COLORS.primary}; color: white; }
        .btn-primary:hover { background: #0f2318; }
        .btn-disabled { background: ${COLORS.border}; color: ${COLORS.muted}; cursor: not-allowed; }
        .lost-item { display: flex; gap: 14px; padding: 14px; border-radius: 12px; border: 1px solid ${COLORS.border}; margin-bottom: 10px; background: ${COLORS.cardBg}; transition: all 0.2s; }
        .lost-item:hover { border-color: ${COLORS.accent}; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .lost-emoji { font-size: 32px; }
        .lost-info { flex: 1; }
        .lost-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
        .lost-desc { font-size: 12px; color: ${COLORS.muted}; margin-bottom: 6px; }
        .lost-meta { display: flex; gap: 12px; flex-wrap: wrap; }
        .lost-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${COLORS.light}; color: ${COLORS.muted}; }
        .claimed-badge { background: #d4f4e0; color: ${COLORS.success}; }
        .message-item { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; border: 1px solid ${COLORS.border}; margin-bottom: 8px; background: ${COLORS.cardBg}; cursor: pointer; transition: all 0.2s; }
        .message-item:hover { border-color: ${COLORS.accent}; }
        .message-item.unread { border-right: 3px solid ${COLORS.accent}; background: #fffbf0; }
        .msg-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent}); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0; }
        .msg-info { flex: 1; }
        .msg-from { font-size: 13px; font-weight: 700; }
        .msg-product { font-size: 11px; color: ${COLORS.accent}; }
        .msg-text { font-size: 12px; color: ${COLORS.muted}; margin-top: 2px; }
        .msg-time { font-size: 11px; color: ${COLORS.muted}; flex-shrink: 0; }
        .alert-strip { background: linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent}11); border: 1px solid ${COLORS.accent}44; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 13px; }
        .add-btn { background: ${COLORS.primary}; color: white; border: none; border-radius: 10px; padding: 10px 18px; font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .add-btn:hover { background: #0f2318; transform: translateY(-1px); }
        .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid ${COLORS.border}; background: white; font-family: 'Cairo', sans-serif; font-size: 12px; cursor: pointer; color: ${COLORS.muted}; transition: all 0.2s; }
        .filter-chip:hover, .filter-chip.active { background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary}; }
        .seller-type { font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 700; }
        .type-student { background: #dbeafe; color: #1d4ed8; }
        .type-doctor { background: #fce7f3; color: #be185d; }
        .type-grad { background: #dcfce7; color: #15803d; }
        .type-staff { background: #fef3c7; color: #b45309; }
        @media (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .products-grid { grid-template-columns: repeat(2, 1fr); }
          .two-col { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">🔬</div>
            {sidebarOpen && (
              <div className="logo-text">
                <h3>سوق كلية العلوم</h3>
                <span>جامعة القاهرة</span>
              </div>
            )}
          </div>
          <div className="nav-items">
            {navItems.map(item => (
              <div key={item.id}
                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => setActivePage(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
                {globalUnreadCount > 0 && (
                  <span className="badge">{globalUnreadCount}</span>
                )}
              </div>
            ))}
          </div>
          <div className="sidebar-toggle">
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="page-title">
              {navItems.find(n => n.id === activePage)?.icon || "💬"}{" "}
              {navItems.find(n => n.id === activePage)?.label || "الدردشة"}
            </div>
            <div className="topbar-actions">
              <div ref={searchRef} style={{ position: "relative" }}>
                <div className="search-box">
                  <span>{searching ? "⏳" : "🔍"}</span>
                  <input
                    placeholder="ابحث في المنتجات، المكتبة، المفقودات..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                    onFocus={() => setShowSearchDropdown(true)}
                  />
                  {searchQuery && (
                    <span
                      onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
                      style={{ cursor: "pointer", color: COLORS.muted, fontSize: 14, padding: "0 4px" }}
                    >✕</span>
                  )}
                </div>

                {/* Search Dropdown */}
                {showSearchDropdown && searchQuery.trim().length >= 2 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)",
                    right: 0, width: 420, background: "white",
                    borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                    border: `1px solid ${COLORS.border}`, zIndex: 999,
                    overflow: "hidden", direction: "rtl",
                    fontFamily: "'Cairo', sans-serif",
                  }}>
                    {searching ? (
                      <div style={{ padding: "20px", textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
                        ⏳ جاري البحث...
                      </div>
                    ) : totalResults === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
                        🔍 لا توجد نتائج لـ "{searchQuery}"
                      </div>
                    ) : (
                      <div>
                        {/* Products Results */}
                        {results.products.length > 0 && (
                          <div>
                            <div style={{ padding: "10px 16px 6px", fontSize: 11, fontWeight: 700, color: COLORS.muted, background: COLORS.light, display: "flex", justifyContent: "space-between" }}>
                              <span>🛒 المنتجات</span>
                              <span style={{ color: COLORS.accent }}>{results.products.length} نتيجة</span>
                            </div>
                            {results.products.map(p => (
                              <div key={p.id}
                                onClick={() => handleSearchResultClick("products")}
                                style={{
                                  padding: "10px 16px", display: "flex", alignItems: "center",
                                  gap: 10, cursor: "pointer", borderBottom: `1px solid ${COLORS.light}`,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = COLORS.light}
                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                              >
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                  {p.imageURL
                                    ? <img src={p.imageURL} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    : <span style={{ fontSize: 18 }}>{p.image || "📦"}</span>
                                  }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                                  <div style={{ fontSize: 11, color: COLORS.muted }}>{p.category} · {p.seller}</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: COLORS.accent, flexShrink: 0 }}>{p.price} ج</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Library Results */}
                        {results.library.length > 0 && (
                          <div>
                            <div style={{ padding: "10px 16px 6px", fontSize: 11, fontWeight: 700, color: COLORS.muted, background: COLORS.light, display: "flex", justifyContent: "space-between" }}>
                              <span>📚 المكتبة</span>
                              <span style={{ color: COLORS.accent }}>{results.library.length} نتيجة</span>
                            </div>
                            {results.library.map(item => (
                              <div key={item.id}
                                onClick={() => handleSearchResultClick("library")}
                                style={{
                                  padding: "10px 16px", display: "flex", alignItems: "center",
                                  gap: 10, cursor: "pointer", borderBottom: `1px solid ${COLORS.light}`,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = COLORS.light}
                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                              >
                                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.image || "📦"}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{item.title}</div>
                                  <div style={{ fontSize: 11 }}>
                                    <span style={{ color: item.available ? COLORS.success : COLORS.danger }}>
                                      {item.available ? "✅ متاح" : "❌ مستعار"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Lost & Found Results */}
                        {results.lostFound.length > 0 && (
                          <div>
                            <div style={{ padding: "10px 16px 6px", fontSize: 11, fontWeight: 700, color: COLORS.muted, background: COLORS.light, display: "flex", justifyContent: "space-between" }}>
                              <span>🔍 المفقودات</span>
                              <span style={{ color: COLORS.accent }}>{results.lostFound.length} نتيجة</span>
                            </div>
                            {results.lostFound.map(item => (
                              <div key={item.id}
                                onClick={() => handleSearchResultClick("lostfound")}
                                style={{
                                  padding: "10px 16px", display: "flex", alignItems: "center",
                                  gap: 10, cursor: "pointer", borderBottom: `1px solid ${COLORS.light}`,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = COLORS.light}
                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                              >
                                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.image || "🔍"}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{item.title}</div>
                                  <div style={{ fontSize: 11, color: COLORS.muted }}>📍 {item.location}</div>
                                </div>
                                {item.claimed && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "#d4f4e0", color: COLORS.success }}>مُسترد</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ padding: "10px 16px", background: COLORS.light, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: COLORS.muted }}>{totalResults} نتيجة إجمالية</span>
                          <span
                            style={{ fontSize: 11, color: COLORS.accent, cursor: "pointer", fontWeight: 700 }}
                            onClick={() => { handleSearchResultClick("products"); }}
                          >عرض كل المنتجات ←</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setActivePage("messages")}>
                <span style={{ fontSize: 20 }}>🔔</span>
                {globalUnreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -4, left: -4,
                    background: COLORS.danger, color: "white",
                    width: 16, height: 16, borderRadius: "50%",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>{globalUnreadCount}</span>
                )}
              </div>
              <div className="avatar" onClick={() => setActivePage("profile")}>{avatarLetter}</div>
              <button onClick={handleLogout} style={{
                background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                color: "white", border: "none", borderRadius: "8px",
                padding: "8px 16px", fontSize: "12px", fontWeight: "700",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                fontFamily: "'Cairo', sans-serif",
              }}>
                🚪 تسجيل الخروج
              </button>
            </div>
          </div>
          <div className="content">
            {pageMap[activePage]}
          </div>
        </div>
      </div>
    </>
  );
}