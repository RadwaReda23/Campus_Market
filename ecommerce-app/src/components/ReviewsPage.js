import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { COLORS } from "../constants";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Reviews ──────────────────────────────────────────────────────────
  const fetchReviews = async () => {
    let serverReviews = [];
    try {
      const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      serverReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Firestore read failed:", error);
    }

    // قراءة التعليقات المحلية دائماً ودمجها
    const localReviews = JSON.parse(localStorage.getItem("my_reviews") || "[]");
    
    // دمج وتصفية التكرار (لو السيرفر اشتغل لاحقاً)
    const combined = [...localReviews, ...serverReviews];
    const unique = Array.from(new Map(combined.map(item => [item.userId + item.comment, item])).values());
    
    // الترتيب حسب التاريخ
    unique.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    setReviews(unique);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // ─── Submit Review ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (rating === 0 || comment.trim().length < 2) {
      alert("يرجى إكمال البيانات");
      return;
    }

    setSubmitting(true);
    
    const reviewData = {
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "مستخدم",
      rating: rating,
      comment: comment.trim(),
      createdAt: Date.now()
    };

    // حفظ محلي فوري ومضمون
    const local = JSON.parse(localStorage.getItem("my_reviews") || "[]");
    local.unshift({ id: "local-" + Date.now(), ...reviewData });
    localStorage.setItem("my_reviews", JSON.stringify(local));

    try {
      // محاولة حفظ في السيرفر في الخلفية
      await addDoc(collection(db, "feedback"), reviewData);
    } catch (error) {
      console.error("Server sync failed, but saved locally");
    } finally {
      setComment("");
      setRating(0);
      setSubmitting(false);
      fetchReviews(); // تحديث العرض
    }
  };

  // ─── Delete Review ─────────────────────────────────────────────────────────
  const handleDelete = async (id, userId) => {
    if (userId !== auth.currentUser?.uid) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;

    try {
      // الحذف من السيرفر
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "feedback", id));
    } catch (error) {
      console.error("Server delete failed:", error);
    }

    // الحذف من التخزين المحلي دائماً
    const local = JSON.parse(localStorage.getItem("my_reviews") || "[]");
    const updatedLocal = local.filter(r => r.id !== id);
    localStorage.setItem("my_reviews", JSON.stringify(updatedLocal));

    // تحديث الواجهة
    setReviews(prev => prev.filter(r => r.id !== id));
    alert("تم حذف التعليق بنجاح");
  };

  return (
    <div style={containerStyle}>
      <h2 style={headerTitle}>🌟 آراء وتقييمات المستخدمين</h2>
      
      {/* Form Card */}
      <div style={formCardStyle}>
        <h3 style={formTitleStyle}>شاركنا تجربتك في الموقع</h3>
        
        <div style={starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              style={{
                fontSize: "32px",
                cursor: "pointer",
                color: rating >= star ? COLORS.accent : "#e0e0e0",
                transition: "all 0.2s ease"
              }}
            >
              ★
            </span>
          ))}
        </div>

        <textarea
          placeholder="اكتب رأيك هنا..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={textareaStyle}
        />

        <button 
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...buttonStyle,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "not-allowed" : "pointer"
          }}
        >
          {submitting ? "جاري الإرسال..." : "تسجيل التقييم"}
        </button>
      </div>

      {/* Reviews List */}
      <div style={listContainer}>
        <h3 style={listTitleStyle}>آراء المستخدمين ({reviews.length})</h3>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: COLORS.muted }}>جاري التحميل...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>لا توجد تقييمات بعد. كن أول من يقيم!</div>
        ) : (
          <div style={reviewsGrid}>
            {reviews.map((item) => (
              <div key={item.id} style={reviewCard}>
                <div style={reviewHeader}>
                  <div style={avatarStyle}>
                    {item.userPhoto ? (
                      <img src={item.userPhoto} alt={item.userName} style={avatarImg} />
                    ) : (
                      <span style={{ fontSize: "16px" }}>👤</span>
                    )}
                  </div>
                  <div style={reviewerInfoStyle}>
                    <div style={reviewerNameStyle}>{item.userName}</div>
                    <div style={reviewStarsStyle}>
                      {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <div style={dateStyle}>
                      {item.createdAt && 
                        (item.createdAt.toDate 
                          ? item.createdAt.toDate() 
                          : new Date(item.createdAt)).toLocaleDateString("ar-EG")
                      }
                    </div>
                    {auth.currentUser?.uid === item.userId && (
                      <button 
                        onClick={() => handleDelete(item.id, item.userId)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "2px" }}
                        title="حذف التعليق"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <p style={commentStyle}>{item.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const containerStyle = {
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "20px",
  fontFamily: "'Cairo', sans-serif",
  direction: "rtl"
};

const headerTitle = {
  fontSize: "24px",
  fontWeight: "900",
  color: COLORS.primary,
  marginBottom: "24px",
  textAlign: "center"
};

const formCardStyle = {
  background: "white",
  borderRadius: "16px",
  padding: "24px",
  border: `1px solid ${COLORS.border}`,
  boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  marginBottom: "32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const formTitleStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: COLORS.primary,
  marginBottom: "16px"
};

const starsContainer = {
  display: "flex",
  gap: "8px",
  marginBottom: "20px"
};

const textareaStyle = {
  width: "100%",
  minHeight: "100px",
  padding: "12px 16px",
  borderRadius: "12px",
  border: `1px solid ${COLORS.border}`,
  background: COLORS.light,
  fontSize: "14px",
  fontFamily: "'Cairo', sans-serif",
  marginBottom: "20px",
  resize: "vertical",
  outline: "none"
};

const buttonStyle = {
  padding: "12px 32px",
  borderRadius: "10px",
  background: COLORS.primary,
  color: "white",
  border: "none",
  fontSize: "15px",
  fontWeight: "700",
  fontFamily: "'Cairo', sans-serif",
  transition: "all 0.2s"
};

const listContainer = {
  marginTop: "20px"
};

const listTitleStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: COLORS.primary,
  marginBottom: "20px",
  borderRight: `4px solid ${COLORS.accent}`,
  paddingRight: "12px"
};

const reviewsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "20px"
};

const reviewCard = {
  background: "white",
  borderRadius: "14px",
  padding: "16px",
  border: `1px solid ${COLORS.border}`,
  transition: "transform 0.2s"
};

const reviewHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px"
};

const avatarStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: COLORS.light,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: `1px solid ${COLORS.border}`
};

const avatarImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const reviewerInfoStyle = {
  flex: 1
};

const reviewerNameStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: COLORS.primary
};

const reviewStarsStyle = {
  fontSize: "12px",
  color: COLORS.accent,
  marginTop: "2px"
};

const dateStyle = {
  fontSize: "11px",
  color: COLORS.muted
};

const commentStyle = {
  fontSize: "14px",
  color: COLORS.primary,
  lineHeight: "1.6",
  margin: 0
};
