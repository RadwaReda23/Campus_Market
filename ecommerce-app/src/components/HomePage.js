import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { COLORS } from "../constants";

export default function HomePage({ setActivePage }) {
  const [products, setProducts] = useState([]);
  const [lostItems, setLostItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({
    activeProducts: 0,
    completedDeals: 0,
    registeredUsers: 0,
    libraryItems: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(4));
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        // Fetch lost items
        const lostQuery = query(collection(db, "lostFound"), orderBy("createdAt", "desc"), limit(2));
        const lostSnapshot = await getDocs(lostQuery);
        const lostData = lostSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLostItems(lostData.filter(item => !item.claimed));

        // Fetch messages (mock for now - you'll need to implement messages collection)
        setMessages([
          { id: 1, from: "System", product: "No messages yet", message: "Messages feature coming soon!", time: "Now", unread: false }
        ]);

        // Calculate stats
        const allProductsQuery = query(collection(db, "products"));
        const allProductsSnapshot = await getDocs(allProductsQuery);
        const activeProductsCount = allProductsSnapshot.docs.filter(doc => doc.data().status === "active").length;

        const libraryQuery = query(collection(db, "library"));
        const librarySnapshot = await getDocs(libraryQuery);
        const libraryItemsCount = librarySnapshot.size;

        setStats({
          activeProducts: activeProductsCount,
          completedDeals: Math.floor(activeProductsCount * 0.6), // Estimate
          registeredUsers: Math.floor(activeProductsCount * 8.5), // Estimate
          libraryItems: libraryItemsCount
        });

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>
        <div style={{ fontSize: 24 }}>Loading...</div>
      </div>
    );
  }
  return (
    <>
      <div className="alert-strip">
        <span>📢</span>
        <strong>جديد!</strong> Added {products.length} new products today — check out the latest
        <span
          style={{ marginRight: "auto", color: COLORS.accent, cursor: "pointer", fontWeight: 600 }}
          onClick={() => setActivePage("products")}
        >
          View All ←
        </span>
      </div>

      <div className="stats-grid">
        {[
          { label: "Active Product", value: stats.activeProducts.toString(), icon: "🛍️", color: COLORS.primary },
          { label: "Completed Deal", value: stats.completedDeals.toString(), icon: "✅", color: COLORS.success },
          { label: "Registered User", value: stats.registeredUsers > 1000 ? `${(stats.registeredUsers/1000).toFixed(1)}k` : stats.registeredUsers.toString(), icon: "👥", color: COLORS.info },
          { label: "Library Item", value: stats.libraryItems.toString(), icon: "�", color: COLORS.accent },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: s.color + "18" }}>
              <span style={{ fontSize: 28, color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <h2>{s.value}</h2>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">🛒 أحدث المنتجات</span>
            <span className="section-link" onClick={() => setActivePage("products")}>عرض الكل ←</span>
          </div>
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px", borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  cursor: "pointer", background: COLORS.cardBg,
                }}>
                  <span style={{ fontSize: 28 }}>{p.image}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{p.seller} · {p.time}</div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: COLORS.accent }}>{p.price} ج</div>
                    <div style={{ fontSize: 10, color: COLORS.muted }}>{p.views} مشاهدة</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">🔍 المفقودات الأخيرة</span>
              <span className="section-link" onClick={() => setActivePage("lostfound")}>عرض الكل ←</span>
            </div>
            <div className="section-body">
              {lostItems.map(item => (
                <div key={item.id} className="lost-item">
                  <span className="lost-emoji">{item.image}</span>
                  <div className="lost-info">
                    <div className="lost-title">{item.title}</div>
                    <div className="lost-desc">{item.description}</div>
                    <div className="lost-meta">
                      <span className="lost-tag">📍 {item.location}</span>
                      <span className="lost-tag">🕐 {item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <span className="section-title">💬 الرسائل الجديدة</span>
              <span className="section-link" onClick={() => setActivePage("messages")}>عرض الكل ←</span>
            </div>
            <div className="section-body">
              {messages.filter(m => m.unread).map(msg => (
                <div key={msg.id} className={`message-item ${msg.unread ? "unread" : ""}`}>
                  <div className="msg-avatar">{msg.from[0]}</div>
                  <div className="msg-info">
                    <div className="msg-from">{msg.from}</div>
                    <div className="msg-product">📦 {msg.product}</div>
                    <div className="msg-text">{msg.message}</div>
                  </div>
                  <div className="msg-time">{msg.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}