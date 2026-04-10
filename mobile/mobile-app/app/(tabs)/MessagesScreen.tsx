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

export default function MessagesScreen() {
  const user = auth.currentUser;

  const [items, setItems] = useState<any[]>([]);
  const [messagesMap, setMessagesMap] = useState<any>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [openChat, setOpenChat] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // ===== LOAD ITEMS =====
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

  // ===== REALTIME لكل الشاتات =====
  useEffect(() => {
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

  // ===== OPEN CHAT =====
  const openChatBox = (item: any) => {
    setSelectedItem(item);
    setOpenChat(true);

    setMessages(messagesMap[item.id] || []);

    markAsRead(item.id);
  };

  // ===== MARK AS READ =====
  const markAsRead = async (itemId: string) => {
    const msgs = messagesMap[itemId] || [];

    msgs.forEach(async (m: any) => {
      if (!m.readBy?.includes(user?.email)) {
        await updateDoc(
          doc(db, "library", itemId, "messages", m.id),
          {
            readBy: arrayUnion(user?.email),
          }
        );
      }
    });
  };

  // ===== SEND =====
  const sendMessage = async () => {
    if (!text.trim() || !selectedItem || !user) return;

    await addDoc(
      collection(db, "library", selectedItem.id, "messages"),
      {
        text: text.trim(),
        sender: user.email,
        createdAt: new Date(),
        readBy: [user.email],
      }
    );

    setText("");
  };

  // ===== HELPERS =====
  const getLastMessage = (id: string) => {
    const msgs = messagesMap[id];
    return msgs?.length ? msgs[msgs.length - 1] : null;
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
      : date?.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredItems = showUnreadOnly
    ? items.filter((i) => getUnreadCount(i.id) > 0)
    : items;

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>💬 Messages</Text>

        <TouchableOpacity
          onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          style={styles.filterBtn}
        >
          <Text style={{ color: "white" }}>
            {showUnreadOnly ? "All" : "Unread"}
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
            const lastMsg = getLastMessage(item.id);
            const unread = getUnreadCount(item.id);

            return (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => openChatBox(item)}
              >
                <Image
                  source={{ uri: item.imageURL }}
                  style={styles.img}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>

                  <Text style={styles.last}>
                    {lastMsg?.text || "No messages"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.time}>
                    {formatTime(lastMsg?.createdAt)}
                  </Text>

                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unread}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* CHAT */}
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
            data={messages}
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

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              style={styles.input}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={styles.sendBtn}
            >
              <Text style={{ color: "white" }}>Send</Text>
            </TouchableOpacity>
          </View>

        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },

  header: {
    backgroundColor: "#1a3a2a",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  headerText: { color: "white", fontWeight: "bold" },

  filterBtn: {
    borderWidth: 1,
    borderColor: "white",
    padding: 5,
    borderRadius: 6,
  },

  chatItem: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "white",
    margin: 5,
    borderRadius: 10,
    alignItems: "center",
  },

  img: {
    width: 45,
    height: 45,
    borderRadius: 10,
    marginRight: 10,
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

  badgeText: { color: "white", fontSize: 10 },

  chatBox: { flex: 1 },

  chatHeader: {
    backgroundColor: "#1a3a2a",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  msg: {
    padding: 10,
    margin: 5,
    borderRadius: 10,
    maxWidth: "70%",
  },

  me: {
    backgroundColor: "#1a3a2a",
    alignSelf: "flex-end",
  },

  other: {
    backgroundColor: "#888",
    alignSelf: "flex-start",
  },

  inputRow: {
    flexDirection: "row",
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
    marginLeft: 5,
    borderRadius: 10,
  },
});