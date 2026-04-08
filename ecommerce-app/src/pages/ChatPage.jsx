// ─── Chat Page ──────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  const userId = auth.currentUser?.uid;
  const userName = auth.currentUser?.displayName || auth.currentUser?.email || "مجهول";

  // جلب الرسائل realtime
  useEffect(() => {
    const q = query(collection(db, "chatMessages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      // scroll تلقائي لآخر رسالة
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "chatMessages"), {
        userId,
        userName,
        text: input.trim(),
        createdAt: serverTimestamp()
      });
      setInput("");
    } catch (err) {
      console.error(err);
      alert("حصل خطأ أثناء إرسال الرسالة ❌");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.userId === userId ? "flex-end" : "flex-start",
              background: msg.userId === userId ? "#D4F4E0" : "#f0f0f0",
              color: "#111",
              padding: "8px 14px",
              borderRadius: 12,
              maxWidth: "70%",
              wordBreak: "break-word",
              fontSize: 13,
            }}
          >
            {msg.userName !== userId && <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{msg.userName}</div>}
            {msg.text}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #ddd", background: "#fff" }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="اكتب رسالتك هنا..."
          style={{
            flex: 1, padding: 10, borderRadius: 20, border: "1px solid #ccc",
            outline: "none", fontFamily: "'Cairo', sans-serif", fontSize: 13
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 16px", borderRadius: 20, border: "none",
            background: "#0A8F5C", color: "white", fontWeight: 700,
            cursor: "pointer", fontSize: 13
          }}
        >
          إرسال
        </button>
      </div>
    </div>
  );
}