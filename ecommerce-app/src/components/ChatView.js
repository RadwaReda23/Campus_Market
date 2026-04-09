import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, setDoc, getDoc, serverTimestamp, updateDoc
} from "firebase/firestore";
import { COLORS } from "../constants";

export default function ChatView({ chatData, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationValue, setDurationValue] = useState("");
  const [durationType, setDurationType] = useState("days");
  const messagesEndRef = useRef(null);

  const currentUser = auth.currentUser;
  
  // بناء معرف المحادثة الفريد بين المشتري والبائع بخصوص هذا المنتج
  // الترتيب الأبجدي للمعرفات بيضمن إنهم لو اتكلموا سوا دايماً يروحوا لنفس الـ Document
  const convId = chatData.conversationId || 
    [currentUser.uid, chatData.sellerId].sort().join("_") + "_" + chatData.productId;

  useEffect(() => {
    // إعداد الـ Conversation Document إذا لم يكن موجوداً
    const setupConversation = async () => {
      const convRef = doc(db, "conversations", convId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [currentUser.uid, chatData.sellerId],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || currentUser.email,
            [chatData.sellerId]: chatData.sellerName || "بائع"
          },
          productId: chatData.productId,
          productTitle: chatData.productTitle,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: {
            [currentUser.uid]: 0,
            [chatData.sellerId]: 0
          },
          createdAt: serverTimestamp(),
          isLibrary: chatData.isLibrary || false
        });
      } else {
        // تصفير العداد عند فتح المحادثة
        const unreadCount = convSnap.data().unreadCount || {};
        if (unreadCount[currentUser.uid] > 0) {
          await updateDoc(convRef, {
            [`unreadCount.${currentUser.uid}`]: 0
          });
        }
      }
    };
    
    if (chatData.sellerId) {
       setupConversation();
    }

    // جلب الرسائل بشكل حي (Real-time)
    const messagesRef = collection(db, "conversations", convId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [convId, chatData, currentUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const messagesRef = collection(db, "conversations", convId, "messages");
      await addDoc(messagesRef, {
        text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
      });

      // Update last message in the conversation doc
      const convRef = doc(db, "conversations", convId);
      
      // Get current unread to increment for the other user
      const convSnap = await getDoc(convRef);
      const currentUnread = convSnap.exists() && convSnap.data().unreadCount 
          ? convSnap.data().unreadCount[chatData.sellerId === currentUser.uid ? chatData.buyerId : chatData.sellerId] || 0
          : 0;

      const otherUserId = chatData.sellerId === currentUser.uid ? chatData.buyerId : chatData.sellerId;
      if (otherUserId) {
          await updateDoc(convRef, {
            lastMessage: text,
            lastMessageTime: serverTimestamp(),
            [`unreadCount.${otherUserId}`]: currentUnread + 1
          });
      }

    } catch (err) {
      console.error("Error sending message:", err);
      alert("لم يتم إرسال الرسالة.");
    }
  };

  const getOtherUserName = () => {
    if (chatData.participantNames) {
      const otherId = Object.keys(chatData.participantNames).find(id => id !== currentUser.uid);
      return chatData.participantNames[otherId] || "مستخدم";
    }
    return chatData.sellerId === currentUser.uid ? chatData.buyerName : chatData.sellerName;
  };

  const handleSetDuration = async () => {
    if (!durationValue || isNaN(durationValue) || Number(durationValue) <= 0) {
      alert("الرجاء إدخال رقم صحيح.");
      return;
    }
    try {
      const ms = durationType === "days" ? Number(durationValue) * 24 * 60 * 60 * 1000 : Number(durationValue) * 60 * 60 * 1000;
      const calculatedTimestamp = new Date(Date.now() + ms);

      const otherUserId = Object.keys(chatData.participantNames || {}).find(id => id !== currentUser.uid) || chatData.buyerId;

      const itemRef = doc(db, "library", chatData.productId);
      await updateDoc(itemRef, {
        available: false,
        borrowerId: otherUserId,
        borrower: getOtherUserName(),
        returnDate: calculatedTimestamp,
        durationType: durationType
      });

      const text = `تم تثبيت الاستعارة لك. مدة الاستعارة: ${durationValue} ${durationType === "days" ? "أيام" : "ساعات"}. يرجى الالتزام بالموعد و إعادة العنصر.`;
      const messagesRef = collection(db, "conversations", convId, "messages");
      await addDoc(messagesRef, {
        text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || "النظام",
        timestamp: serverTimestamp(),
        isSystemMessage: true,
      });

      setShowDurationModal(false);
      alert("تم تأكيد الاستعارة بنجاح!");
    } catch (err) {
      console.error(err);
      alert("حصل خطأ أثناء تحديث الإعارة.");
    }
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "white", borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden", direction: "rtl", fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.light, display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: COLORS.primary, padding: "0 8px" }}>
          ➔
        </button>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {getOtherUserName() ? getOtherUserName()[0].toUpperCase() : "👤"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>{getOtherUserName()}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>بخصوص: <strong style={{ color: COLORS.accent }}>{chatData.productTitle}</strong></div>
        </div>
        {chatData.isLibrary && currentUser.uid === chatData.sellerId && (
          <button 
            onClick={() => setShowDurationModal(true)}
            style={{
              padding: "6px 12px", background: COLORS.accent, color: "white", 
              border: "none", borderRadius: 8, fontFamily: "'Cairo', sans-serif", 
              fontSize: 12, fontWeight: 700, cursor: "pointer"
            }}>
            ⏳ تحديد الاستعارة
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto", background: COLORS.cardBg, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>جاري التحميل...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
            ابدأ المحادثة الآن عن المنتج!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.uid;
            return (
              <div key={msg.id || index} style={{
                alignSelf: isMe ? "flex-start" : "flex-end", // RTL: flex-start = يمين, flex-end = يسار
                maxWidth: "75%",
                background: isMe ? COLORS.primary : "white",
                color: isMe ? "white" : COLORS.primary,
                border: isMe ? "none" : `1px solid ${COLORS.border}`,
                padding: "10px 14px",
                borderRadius: "16px",
                borderTopRightRadius: isMe ? "4px" : "16px",
                borderTopLeftRadius: !isMe ? "4px" : "16px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 14 }}>{msg.text}</div>
                <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.7)" : COLORS.muted, marginTop: 4, textAlign: "right" }}>
                  {msg.timestamp?.toDate().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "numeric" }) || "الآن"}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, background: "white", display: "flex", gap: 10, alignItems: "center" }}>
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالة..."
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 24, border: `1px solid ${COLORS.border}`,
            fontSize: 14, fontFamily: "'Cairo', sans-serif", outline: "none", background: COLORS.cardBg
          }}
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          style={{
            width: 46, height: 46, borderRadius: "50%", background: newMessage.trim() ? COLORS.accent : COLORS.border,
            color: newMessage.trim() ? COLORS.primary : COLORS.muted, border: "none", cursor: newMessage.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "background 0.2s"
          }}
        >
          ➤
        </button>
      </form>

    </div>
      
      {showDurationModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, direction: "rtl", fontFamily: "'Cairo', sans-serif" }}>
          <div style={{ background: "white", padding: 24, borderRadius: 16, width: 320 }}>
            <h3 style={{ marginBottom: 16, color: COLORS.primary, fontSize: 16 }}>⏳ تحديد مدة الاستعارة</h3>
            
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input 
                type="number" 
                value={durationValue} 
                onChange={(e) => setDurationValue(e.target.value)}
                placeholder="المدة..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, outline: "none", fontFamily: "'Cairo', sans-serif" }}
              />
              <select 
                value={durationType}
                onChange={(e) => setDurationType(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, outline: "none", fontFamily: "'Cairo', sans-serif" }}
              >
                <option value="days">أيام</option>
                <option value="hours">ساعات</option>
              </select>
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={handleSetDuration}
                style={{ flex: 1, padding: "10px", background: COLORS.primary, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}
              >تأكيد الاستعارة</button>
              <button 
                onClick={() => setShowDurationModal(false)}
                style={{ flex: 1, padding: "10px", background: COLORS.light, color: COLORS.primary, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
