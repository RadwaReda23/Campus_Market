import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, setDoc, getDoc, serverTimestamp, updateDoc
} from "firebase/firestore";
import { COLORS } from "../constants";

export default function ChatView({ chatData, onBack, onViewProfile }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationValue, setDurationValue] = useState("");
  const [durationType, setDurationType] = useState("days");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeEmojiMenu, setActiveEmojiMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const CLOUDINARY_CLOUD_NAME = "dgowyewii";
  const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

  const currentUser = auth.currentUser;
  
  // بناء معرف المحادثة الفريد بين المشتري والبائع بخصوص هذا المنتج
  // الترتيب الأبجدي للمعرفات بيضمن إنهم لو اتكلموا سوا دايماً يروحوا لنفس الـ Document
  const convId = chatData.conversationId || 
    [currentUser.uid, chatData.sellerId].sort().join("_") + "_" + chatData.productId;

  useEffect(() => {
    // إعداد الـ Conversation Document إذا لم يكن موجوداً
    // إعداد الـ Conversation Document إذا لم يكن موجوداً أو تحديث البيانات الناقصة
    const setupConversation = async () => {
      const convRef = doc(db, "conversations", convId);
      const convSnap = await getDoc(convRef);
      
      let finalProductImageURL = chatData.productImageURL || "";
      let finalProductImage = chatData.productImage || "📦";
      let finalProductTitle = chatData.productTitle;

      // إذا كانت البيانات ناقصة، نحاول جلبها من مجموعة المنتجات الأصلية
      if (!finalProductImageURL || !finalProductTitle) {
        try {
          // محاولة البحث في المجموعات الثلاث
          const collections = ["products", "library", "lostFound"];
          for (const colName of collections) {
            const prodSnap = await getDoc(doc(db, colName, chatData.productId));
            if (prodSnap.exists()) {
              const pData = prodSnap.data();
              finalProductImageURL = pData.imageURL || "";
              finalProductImage = pData.image || (colName === "library" ? "📚" : colName === "lostFound" ? "🔍" : "📦");
              if (!finalProductTitle) finalProductTitle = pData.title;
              break;
            }
          }
        } catch (err) {
          console.error("Error fetching product info for chat sync:", err);
        }
      }

      const convData = {
        participants: [currentUser.uid, chatData.sellerId],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || currentUser.email,
          [chatData.sellerId]: chatData.sellerName || "بائع"
        },
        productId: chatData.productId,
        productTitle: finalProductTitle,
        productImageURL: finalProductImageURL,
        productImage: finalProductImage,
        isLibrary: chatData.isLibrary || false
      };

      if (!convSnap.exists()) {
        await setDoc(convRef, {
          ...convData,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: {
            [currentUser.uid]: 0,
            [chatData.sellerId]: 0
          },
          createdAt: serverTimestamp(),
        });
      } else {
        // تحديث البيانات في حالة كانت ناقصة (للمحادثات القديمة)
        const existingData = convSnap.data();
        const updates = {};
        if (!existingData.productImageURL && finalProductImageURL) updates.productImageURL = finalProductImageURL;
        if (!existingData.productImage && finalProductImage) updates.productImage = finalProductImage;
        if (!existingData.productTitle && finalProductTitle) updates.productTitle = finalProductTitle;
        
        // تصفير العداد عند فتح المحادثة
        const unreadCount = existingData.unreadCount || {};
        if (unreadCount[currentUser.uid] > 0) {
          updates[`unreadCount.${currentUser.uid}`] = 0;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(convRef, updates);
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

  const handleSend = async (e, imageURL = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageURL) return;

    const text = newMessage.trim();
    if (!imageURL) setNewMessage("");

    try {
      const messagesRef = collection(db, "conversations", convId, "messages");
      await addDoc(messagesRef, {
        text,
        imageURL: imageURL || "",
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        reactions: {}
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
            lastMessage: imageURL ? "📷 صورة" : text,
            lastMessageTime: serverTimestamp(),
            [`unreadCount.${otherUserId}`]: currentUnread + 1
          });
      }

    } catch (err) {
      console.error("Error sending message:", err);
      alert("لم يتم إرسال الرسالة.");
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      
      if (data.secure_url) {
        await handleSend(null, data.secure_url);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("فشل رفع الصورة.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    let reactions = msg.reactions || {};
    let currentEmojiUsers = reactions[emoji] || [];

    if (currentEmojiUsers.includes(currentUser.uid)) {
      currentEmojiUsers = currentEmojiUsers.filter(uid => uid !== currentUser.uid);
    } else {
      currentEmojiUsers = [...currentEmojiUsers, currentUser.uid];
    }

    if (currentEmojiUsers.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = currentEmojiUsers;
    }

    try {
      const msgRef = doc(db, "conversations", convId, "messages", messageId);
      await updateDoc(msgRef, { reactions: reactions });
      setActiveEmojiMenu(null);
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };
  const getOtherUserName = () => {
    if (chatData.participantNames) {
      const otherId = Object.keys(chatData.participantNames).find(id => id !== currentUser.uid);
      return chatData.participantNames[otherId] || "مستخدم";
    }
    return chatData.sellerId === currentUser.uid ? chatData.buyerName : chatData.sellerName;
  };

  const getOtherUserId = () => {
    if (chatData.participants) {
      return chatData.participants.find(id => id !== currentUser.uid);
    }
    return chatData.sellerId === currentUser.uid ? chatData.buyerId : chatData.sellerId;
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

        {/* Product Image */}
        <div style={{ width: 44, height: 44, borderRadius: 8, background: COLORS.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
          {chatData.productImageURL ? (
            <img src={chatData.productImageURL} alt={chatData.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 24 }}>{chatData.productImage || "📦"}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {chatData.productTitle}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, display: "flex", alignItems: "center", gap: 4 }}>
            <span>البائع:</span>
            <strong 
              onClick={() => onViewProfile(getOtherUserId())}
              style={{ color: COLORS.accent, cursor: "pointer", textDecoration: "underline" }}
            >
              {chatData.sellerName || getOtherUserName()}
            </strong>
          </div>
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
      <div style={{ flex: 1, padding: "40px 20px", overflowY: "auto", background: COLORS.cardBg, display: "flex", flexDirection: "column", gap: 12 }}>
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
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                position: "relative"
              }}>
                {/* Reaction Trigger */}
                <button 
                  onClick={() => setActiveEmojiMenu(activeEmojiMenu === msg.id ? null : msg.id)}
                  style={{
                    position: "absolute",
                    bottom: -8,
                    [isMe ? "left" : "right"]: -12,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "white", border: `1px solid ${COLORS.border}`,
                    fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)", zIndex: 10
                  }}>
                  ☺
                </button>

                {/* Emoji Menu */}
                {activeEmojiMenu === msg.id && (
                  <div style={{
                    position: "absolute",
                    bottom: 25,
                    [isMe ? "left" : "right"]: -12,
                    background: "white", padding: "6px 12px", borderRadius: 30,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${COLORS.border}`,
                    display: "flex", gap: 10, zIndex: 100,
                    width: "max-content",
                    whiteSpace: "nowrap"
                  }}>
                    {["👍", "❤️", "😂", "😮", "😢"].map(emoji => (
                      <span 
                        key={emoji} 
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        style={{ cursor: "pointer", fontSize: 18, transition: "transform 0.1s" }}
                        onMouseEnter={e => e.target.style.transform = "scale(1.3)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                {msg.imageURL && (
                  <div style={{ marginBottom: 6, borderRadius: 8, overflow: "hidden", border: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : COLORS.border}` }}>
                    <img src={msg.imageURL} alt="sent" style={{ maxWidth: "100%", display: "block" }} />
                  </div>
                )}
                {msg.text && <div style={{ fontSize: 14 }}>{msg.text}</div>}
                
                {/* Reaction Display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div style={{
                    display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap"
                  }}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <div 
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        style={{
                          background: users.includes(currentUser.uid) ? COLORS.accent + "33" : "rgba(0,0,0,0.05)",
                          padding: "2px 6px", borderRadius: 10, fontSize: 11, display: "flex", alignItems: "center", gap: 3,
                          cursor: "pointer", border: `1px solid ${users.includes(currentUser.uid) ? COLORS.accent : "transparent"}`
                        }}
                       >
                        <span>{emoji}</span>
                        <span style={{ fontWeight: 700 }}>{users.length}</span>
                      </div>
                    ))}
                  </div>
                )}

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
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, background: "white", display: "flex", gap: 10, alignItems: "center" }}>
        <button 
          onClick={() => fileInputRef.current.click()}
          disabled={uploadingImage}
          style={{
            width: 40, height: 40, borderRadius: "50%", background: COLORS.light,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}
        >
          {uploadingImage ? "⏳" : "📷"}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept="image/*"
          onChange={handleImageSelect}
        />
        <form onSubmit={handleSend} style={{ flex: 1, display: "flex", gap: 10 }}>
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
