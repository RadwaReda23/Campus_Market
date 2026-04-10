import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  I18nManager,
} from "react-native";

import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { auth, db } from "../firebase";

I18nManager.forceRTL(true); // 🔥 Arabic UI

export default function MessagesScreen() {
  const user = auth.currentUser;

  const [items, setItems] = useState<any[]>([]);
  const [messagesMap, setMessagesMap] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [openChat, setOpenChat] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  /* ================= LOAD PRODUCTS ================= */
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "library"));

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setItems(data);
      setLoading(false);
    };

    load();
  }, []);

  /* ================= REALTIME MESSAGES ================= */
  useEffect(() => {
    if (!items.length) return;

    const unsubscribers: any[] = [];

    items.forEach((item) => {
      const q = query(
        collection(db, "library", item.id, "messages"),
        orderBy("createdAt", "asc")
      );

      const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setMessagesMap((prev: any) => ({
          ...prev,
          [item.id]: msgs,
        }));
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [items]);

  /* ================= OPEN CHAT ================= */
  const openChatBox = async (item: any) => {
    setSelectedItem(item);
    setOpenChat(true);
    markAsRead(item.id);
  };

  /* ================= MARK AS READ ================= */
  const markAsRead = async (itemId: string) => {
    const msgs = messagesMap[itemId] || [];

    msgs.forEach(async (m: any) => {
      if (!m.readBy?.includes(user?.email)) {
        await updateDoc(doc(db, "library", itemId, "messages", m.id), {
          readBy: arrayUnion(user?.email),
        });
      }
    });
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!text.trim() || !selectedItem || !user) return;

    await addDoc(collection(db, "library", selectedItem.id, "messages"), {
      text: text.trim(),
      sender: user.email,
      createdAt: new Date(),
      readBy: [user.email],
    });

    setText("");
  };

  /* ================= HELPERS ================= */
  const getLastMessage = (id: string) => {
    const msgs = messagesMap[id] || [];
    return msgs.length ? msgs[msgs.length - 1] : null;
  };

  const getUnreadCount = (id: string) => {
    const msgs = messagesMap[id] || [];
    return msgs.filter(
      (m: any) =>
        m.sender !== user?.email &&
        !m.readBy?.includes(user?.email)
    ).length;
  };

  const formatTime = (date: any) => {
    if (!date) return "";

    const d = date?.toDate
      ? date.toDate()
      : new Date(date);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ================= SORT CHAT (LAST MESSAGE FIRST) ================= */
  const sortedItems = [...items].sort((a, b) => {
    const aLast = getLastMessage(a.id)?.createdAt;
    const bLast = getLastMessage(b.id)?.createdAt;

    const aTime = aLast?.toDate ? aLast.toDate().getTime() : 0;
    const bTime = bLast?.toDate ? bLast.toDate().getTime() : 0;

    return bTime - aTime;
  });

  const filteredItems = showUnreadOnly
    ? sortedItems.filter((i) => getUnreadCount(i.id) > 0)
    : sortedItems;

  /* ================= UI ================= */
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>📩 الرسائل</Text>

        <TouchableOpacity
          onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          style={styles.btn}
        >
          <Text style={{ color: "white" }}>
            {showUnreadOnly ? "الكل" : "غير مقروء"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const last = getLastMessage(item.id);
            const unread = getUnreadCount(item.id);

            return (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => openChatBox(item)}
              >

                {/* IMAGE + NAME */}
                <Image
                  source={{ uri: item.imageURL }}
                  style={styles.img}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>

                  <Text style={styles.last} numberOfLines={1}>
                    {last?.text || "لا توجد رسائل"}
                  </Text>
                </View>

                {/* TIME + BADGE */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.time}>
                    {formatTime(last?.createdAt)}
                  </Text>

                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={{ color: "white" }}>{unread}</Text>
                    </View>
                  )}
                </View>

              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* CHAT MODAL */}
      <Modal visible={openChat} animationType="slide">
        <View style={styles.chatBox}>

          <View style={styles.chatHeader}>
            <Text style={{ color: "white" }}>
              {selectedItem?.title}
            </Text>

            <TouchableOpacity onPress={() => setOpenChat(false)}>
              <Text style={{ color: "white" }}>✖</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messagesMap[selectedItem?.id] || []}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              const isMe = item.sender === user?.email;

              return (
                <View
                  style={[
                    styles.msg,
                    isMe ? styles.me : styles.other,
                  ]}
                >
                  <Text style={{ color: "white" }}>
                    {item.text}
                  </Text>
                </View>
              );
            }}
          />

          {/* INPUT */}
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              style={styles.input}
              placeholder="اكتب رسالة..."
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={styles.sendBtn}
            >
              <Text style={{ color: "white" }}>إرسال</Text>
            </TouchableOpacity>
          </View>

        </View>
      </Modal>

    </View>
  );
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },

  header: {
    backgroundColor: "#1a3a2a",
    padding: 15,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },

  headerText: { color: "white", fontWeight: "bold" },

  btn: {
    borderWidth: 1,
    borderColor: "white",
    padding: 5,
    borderRadius: 6,
  },

  chatItem: {
    flexDirection: "row-reverse",
    padding: 10,
    margin: 5,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },

  img: {
    width: 45,
    height: 45,
    borderRadius: 10,
    marginLeft: 10,
  },

  title: { fontWeight: "bold" },

  last: { fontSize: 12, color: "#777" },

  time: { fontSize: 10, color: "#999" },

  badge: {
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 6,
    marginTop: 3,
  },

  chatBox: { flex: 1 },

  chatHeader: {
    backgroundColor: "#1a3a2a",
    padding: 15,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },

  msg: {
    padding: 10,
    margin: 5,
    borderRadius: 10,
    maxWidth: "70%",
    alignSelf: "flex-end",
  },

  me: {
    backgroundColor: "#1a3a2a",
  },

  other: {
    backgroundColor: "#888",
    alignSelf: "flex-start",
  },

  inputRow: {
    flexDirection: "row-reverse",
    padding: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 10,
  },

  sendBtn: {
    backgroundColor: "#1a3a2a",
    padding: 10,
    marginRight: 5,
    borderRadius: 10,
  },
});