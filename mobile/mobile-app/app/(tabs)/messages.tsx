import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  BackHandler
} from "react-native";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const { width } = Dimensions.get("window");

export default function WhatsAppNavigation() {
  const user = auth.currentUser;
  const flatListRef = useRef<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [messagesMap, setMessagesMap] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const backAction = () => {
      if (selectedItem) {
        setSelectedItem(null);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [selectedItem]);

  const getCollectionName = (item: any) => item?.type === "lost" ? "lost" : "library";

  useEffect(() => {
    const load = async () => {
      try {
        const [libSnap, lostSnap] = await Promise.all([
          getDocs(collection(db, "library")),
          getDocs(collection(db, "lost"))
        ]);
        const all = [
          ...libSnap.docs.map(d => ({ id: d.id, type: "library", ...d.data() })),
          ...lostSnap.docs.map(d => ({ id: d.id, type: "lost", ...d.data() }))
        ];
        setItems(all);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const unsubscribers = items.map((item) => {
      const q = query(collection(db, getCollectionName(item), item.id, "messages"), orderBy("createdAt", "asc"));
      return onSnapshot(q, (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessagesMap((prev: any) => ({ ...prev, [item.id]: msgs }));
      });
    });
    return () => unsubscribers.forEach((u) => u?.());
  }, [items]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedItem || !user?.email) return;
    const currentText = text;
    setText("");
    try {
      await addDoc(collection(db, getCollectionName(selectedItem), selectedItem.id, "messages"), {
        text: currentText.trim(),
        senderId: user.uid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerMainTitle}>المحادثات</Text>
      </View>
      <View style={styles.searchBarContainer}>
        <TextInput 
          style={styles.searchBar} 
          placeholder="بحث..." 
          value={searchText}
          onChangeText={setSearchText}
          textAlign="right"
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#075e54" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={items.filter(i => i.title?.includes(searchText))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatListItem} onPress={() => setSelectedItem(item)}>
              <View style={styles.chatListInfo}>
                <View style={styles.chatListHeader}>
                  <Text style={styles.chatListTime}>الآن</Text>
                  <Text style={styles.chatListTitle}>{item.title}</Text>
                </View>
                <Text style={styles.chatListSub} numberOfLines={1}>اضغط لبدء المحادثة</Text>
              </View>
              <Image source={{ uri: item.imageURL }} style={styles.listAvatar} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderConversation = () => (
    <View style={styles.chatArea}>
      <View style={styles.convHeader}>
        <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{selectedItem.title}</Text>
          <Text style={styles.headerStatus}>متصل الآن</Text>
        </View>
        <Image source={{ uri: selectedItem.imageURL }} style={styles.headerAvatar} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messagesMap[selectedItem.id] || []}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            return (
              <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowOther]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                  <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>{item.text}</Text>
                  <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب رسالة..."
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>
          <TouchableOpacity onPress={sendMessage} style={styles.sendCircle}>
            <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {selectedItem ? renderConversation() : renderChatList()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#075e54" },
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 20, backgroundColor: "#075e54", alignItems: "flex-end" },
  headerMainTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  searchBarContainer: { padding: 10, backgroundColor: "#075e54" },
  searchBar: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 15, height: 40 },
  chatListItem: { flexDirection: "row", padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee", alignItems: "center" },
  chatListInfo: { flex: 1, marginRight: 15, alignItems: "flex-end" },
  chatListHeader: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  chatListTitle: { fontWeight: "bold", fontSize: 16 },
  chatListTime: { color: "#888", fontSize: 12 },
  chatListSub: { color: "#666", fontSize: 13, marginTop: 3 },
  listAvatar: { width: 55, height: 55, borderRadius: 27.5 },

  chatArea: { flex: 1, backgroundColor: "#e5ddd5" },
  convHeader: { flexDirection: "row", padding: 10, backgroundColor: "#075e54", alignItems: "center" },
  backBtn: { padding: 10, marginRight: 5 },
  backBtnText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  headerTextContainer: { flex: 1, alignItems: "flex-end", marginRight: 10 },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  headerStatus: { color: "#dcf8c6", fontSize: 11 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },

  messageRow: { flexDirection: "row", marginBottom: 8, width: '100%' },
  rowMe: { justifyContent: "flex-start" }, 
  rowOther: { justifyContent: "flex-end" }, 
  bubble: { padding: 10, borderRadius: 12, maxWidth: "80%" },
  bubbleMe: { backgroundColor: "#dcf8c6", borderTopLeftRadius: 0 }, 
  bubbleOther: { backgroundColor: "#fff", borderTopRightRadius: 0 },
  senderName: { fontSize: 11, fontWeight: "bold", color: "#075e54", marginBottom: 2, textAlign: 'right' },
  messageText: { fontSize: 16, color: "#000" },
  textMe: { textAlign: 'left' },
  textOther: { textAlign: 'right' },
  messageTime: { fontSize: 10, color: "#888", alignSelf: "flex-end", marginTop: 4 },

  // تعديل جذري هنا للرفع
  inputWrapper: { 
    flexDirection: "row", 
    paddingHorizontal: 10,
    paddingTop: 10,
    alignItems: "center", 
    backgroundColor: "#e5ddd5", // نفس لون خلفية الشات عشان ميبانش فراغ
    // رفعناه بـ 120 بيكسل عشان يهرب من شريط التنقل تماماً
    marginBottom: Platform.OS === 'android' ? 120 : 40, 
    paddingBottom: 15,
  },
  inputContainer: { 
    flex: 1, 
    backgroundColor: "#fff", 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    marginRight: 8,
    minHeight: 45,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  textInput: { paddingVertical: 10, fontSize: 16, textAlign: "right" },
  sendCircle: { 
    width: 50, 
    height: 50, 
    backgroundColor: "#075e54", 
    borderRadius: 25, 
    justifyContent: "center", 
    alignItems: "center",
    elevation: 2 
  }
});