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
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  BackHandler,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

export default function WhatsAppNavigation() {
  const user = auth.currentUser;
  const flatListRef = useRef<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [messagesMap, setMessagesMap] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationValue, setDurationValue] = useState("");
  const [durationType, setDurationType] = useState("days");
  const [activeEmojiMenu, setActiveEmojiMenu] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);

  useEffect(() => {
    const backAction = () => {
      if (previewMedia) { setPreviewMedia(null); return true; }
      if (selectedItem) { setSelectedItem(null); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [selectedItem, previewMedia]);

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

  // ── رفع الميديا على Cloudinary ──
  const uploadToCloudinary = async (uri: string, isVideo: boolean) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const data = new FormData();
    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", "chat_media");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();
    if (!result.secure_url) throw new Error("Upload failed");
    return result.secure_url;
  };

  // ── اختيار صورة ──
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) await sendMedia(result.assets[0].uri, false);
  };

  // ── اختيار فيديو ──
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الميديا"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled) await sendMedia(result.assets[0].uri, true);
  };

  // ── تصوير من الكاميرا ──
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الكاميرا"); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (!result.canceled) {
      const isVideo = result.assets[0].type === "video";
      await sendMedia(result.assets[0].uri, isVideo);
    }
  };

  const sendMedia = async (uri: string, isVideo: boolean) => {
    if (!selectedItem || !user) return;
    setUploading(true);
    try {
      const mediaURL = await uploadToCloudinary(uri, isVideo);
      await addDoc(collection(db, getCollectionName(selectedItem), selectedItem.id, "messages"), {
        text: "",
        mediaURL,
        mediaType: isVideo ? "video" : "image",
        senderId: user.uid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        reactions: {}
      });
    } catch (e) {
      Alert.alert("خطأ", "فشل رفع الميديا");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const showMediaOptions = () => {
    Alert.alert("إرسال ميديا", "اختر نوع الميديا", [
      { text: "📷 صورة من المعرض", onPress: pickImage },
      { text: "🎥 فيديو من المعرض", onPress: pickVideo },
      { text: "📸 كاميرا", onPress: openCamera },
      { text: "إلغاء", style: "cancel" },
    ]);
  };

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
        reactions: {}
      });
    } catch (e) { console.error(e); }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedItem || !user) return;
    const colName = getCollectionName(selectedItem);
    const msgRef = doc(db, colName, selectedItem.id, "messages", messageId);
    const msgs = messagesMap[selectedItem.id] || [];
    const msg = msgs.find((m: any) => m.id === messageId);
    if (!msg) return;

    let reactions = { ...(msg.reactions || {}) };
    let currentEmojiUsers: string[] = reactions[emoji] || [];
    if (currentEmojiUsers.includes(user.uid)) {
      currentEmojiUsers = currentEmojiUsers.filter((uid: string) => uid !== user.uid);
    } else {
      currentEmojiUsers = [...currentEmojiUsers, user.uid];
    }
    if (currentEmojiUsers.length === 0) delete reactions[emoji];
    else reactions[emoji] = currentEmojiUsers;

    try {
      await updateDoc(msgRef, { reactions });
      setActiveEmojiMenu(null);
    } catch (err) { console.error(err); }
  };

  const handleSetDuration = async () => {
    if (!durationValue || isNaN(Number(durationValue)) || Number(durationValue) <= 0) {
      Alert.alert("خطأ", "الرجاء إدخال رقم صحيح.");
      return;
    }
    try {
      const ms = durationType === "days"
        ? Number(durationValue) * 24 * 60 * 60 * 1000
        : Number(durationValue) * 60 * 60 * 1000;
      const returnDate = new Date(Date.now() + ms);
      await updateDoc(doc(db, "library", selectedItem.id), { available: false, returnDate, durationType });
      const msgText = `تم تثبيت الاستعارة. المدة: ${durationValue} ${durationType === "days" ? "أيام" : "ساعات"}. يرجى الإعادة في الموعد.`;
      await addDoc(collection(db, "library", selectedItem.id, "messages"), {
        text: msgText,
        senderId: user?.uid,
        senderName: user?.displayName || user?.email || "النظام",
        createdAt: serverTimestamp(),
        isSystemMessage: true,
        reactions: {}
      });
      setShowDurationModal(false);
      Alert.alert("تم ✅", "تم تأكيد الاستعارة بنجاح!");
    } catch (err) {
      Alert.alert("خطأ", "حصل خطأ أثناء تحديث الإعارة.");
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

  // ── شاشة قايمة المحادثات ──
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
          renderItem={({ item }) => {
            const msgs = messagesMap[item.id] || [];
            const lastMsg = msgs[msgs.length - 1];
            return (
              <TouchableOpacity style={styles.chatListItem} onPress={() => setSelectedItem(item)}>
                <View style={styles.chatListInfo}>
                  <View style={styles.chatListHeader}>
                    <Text style={styles.chatListTime}>{lastMsg ? formatTime(lastMsg.createdAt) : ""}</Text>
                    <Text style={styles.chatListTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.chatListSub} numberOfLines={1}>
                    {lastMsg
                      ? lastMsg.mediaType === "image" ? "📷 صورة"
                      : lastMsg.mediaType === "video" ? "🎥 فيديو"
                      : lastMsg.text
                      : "اضغط لبدء المحادثة"}
                  </Text>
                </View>
                <Image source={{ uri: item.imageURL }} style={styles.listAvatar} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  // ── شاشة المحادثة ──
  const renderConversation = () => {
    const messages = messagesMap[selectedItem.id] || [];
    const isOwner = selectedItem.owner === user?.email;

    return (
      <View style={styles.chatArea}>
        <View style={styles.convHeader}>
          <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{selectedItem.title}</Text>
            <Text style={styles.headerStatus}>
              {selectedItem.type === "library" ? "📚 مكتبة" : "🔍 مفقودات"}
            </Text>
          </View>
          {selectedItem.type === "library" && isOwner && (
            <TouchableOpacity style={styles.durationBtn} onPress={() => setShowDurationModal(true)}>
              <Text style={styles.durationBtnText}>⏳ تحديد الاستعارة</Text>
            </TouchableOpacity>
          )}
          <Image source={{ uri: selectedItem.imageURL }} style={styles.headerAvatar} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item: msg }) => {
              const isMe = msg.senderId === user?.uid;

              if (msg.isSystemMessage) {
                return (
                  <View style={styles.systemMsgContainer}>
                    <Text style={styles.systemMsgText}>{msg.text}</Text>
                  </View>
                );
              }

              return (
                <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowOther]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {!isMe && <Text style={styles.senderName}>{msg.senderName}</Text>}

                    {/* صورة */}
                    {msg.mediaType === "image" && msg.mediaURL && (
                      <TouchableOpacity onPress={() => setPreviewMedia({ uri: msg.mediaURL, type: "image" })}>
                        <Image
                          source={{ uri: msg.mediaURL }}
                          style={styles.msgImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}

                    {/* فيديو */}
                    {msg.mediaType === "video" && msg.mediaURL && (
                      <TouchableOpacity onPress={() => setPreviewMedia({ uri: msg.mediaURL, type: "video" })} style={styles.videoThumb}>
                        <Text style={styles.videoPlayIcon}>▶️</Text>
                        <Text style={styles.videoLabel}>اضغط لتشغيل الفيديو</Text>
                      </TouchableOpacity>
                    )}

                    {/* نص */}
                    {!!msg.text && (
                      <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
                        {msg.text}
                      </Text>
                    )}

                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <View style={styles.reactionsRow}>
                        {Object.entries(msg.reactions).map(([emoji, users]: any) => (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => handleToggleReaction(msg.id, emoji)}
                            style={[styles.reactionChip, users.includes(user?.uid) && styles.reactionChipActive]}
                          >
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                            <Text style={styles.reactionCount}>{users.length}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={styles.msgFooter}>
                      <TouchableOpacity
                        onPress={() => setActiveEmojiMenu(activeEmojiMenu === msg.id ? null : msg.id)}
                        style={styles.emojiTrigger}
                      >
                        <Text style={{ fontSize: 12 }}>☺</Text>
                      </TouchableOpacity>
                      <Text style={styles.messageTime}>{formatTime(msg.createdAt)}</Text>
                    </View>

                    {activeEmojiMenu === msg.id && (
                      <View style={[styles.emojiPicker, isMe ? styles.emojiPickerLeft : styles.emojiPickerRight]}>
                        {EMOJIS.map(emoji => (
                          <TouchableOpacity key={emoji} onPress={() => handleToggleReaction(msg.id, emoji)} style={styles.emojiOption}>
                            <Text style={{ fontSize: 20 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {/* Input Bar */}
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={sendMessage} style={styles.sendCircle}>
              <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب رسالة..."
              value={text}
              onChangeText={setText}
              multiline
              textAlign="right"
              onSubmitEditing={sendMessage}
            />
            {/* زرار الميديا */}
            <TouchableOpacity onPress={showMediaOptions} style={styles.mediaBtn} disabled={uploading}>
              {uploading
                ? <ActivityIndicator size="small" color="#075e54" />
                : <Text style={{ fontSize: 22 }}>📎</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Modal تحديد الاستعارة */}
        {showDurationModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>⏳ تحديد مدة الاستعارة</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="المدة..."
                keyboardType="numeric"
                value={durationValue}
                onChangeText={setDurationValue}
                textAlign="right"
              />
              <View style={styles.durationTypeRow}>
                {["days", "hours"].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, durationType === type && styles.typeChipActive]}
                    onPress={() => setDurationType(type)}
                  >
                    <Text style={[styles.typeChipText, durationType === type && styles.typeChipTextActive]}>
                      {type === "days" ? "أيام" : "ساعات"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleSetDuration}>
                  <Text style={styles.modalConfirmText}>تأكيد</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDurationModal(false)}>
                  <Text style={styles.modalCancelText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {selectedItem ? renderConversation() : renderChatList()}

      {/* Preview Modal للصور والفيديو */}
      <Modal visible={!!previewMedia} transparent animationType="fade" onRequestClose={() => setPreviewMedia(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewMedia(null)}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewMedia?.type === "image" && (
            <Image source={{ uri: previewMedia.uri }} style={styles.previewImage} resizeMode="contain" />
          )}
          {previewMedia?.type === "video" && (
            <Video
              source={{ uri: previewMedia.uri }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode={"contain" as any}
              shouldPlay
            />
          )}
        </View>
      </Modal>
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
  durationBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  durationBtnText: { color: "white", fontSize: 11, fontWeight: "bold" },

  messageRow: { flexDirection: "row", marginBottom: 8 },
  rowMe: { justifyContent: "flex-start" },
  rowOther: { justifyContent: "flex-end" },
  bubble: { padding: 10, borderRadius: 12, maxWidth: "80%", position: "relative" },
  bubbleMe: { backgroundColor: "#dcf8c6", borderTopLeftRadius: 0 },
  bubbleOther: { backgroundColor: "#fff", borderTopRightRadius: 0 },
  senderName: { fontSize: 11, fontWeight: "bold", color: "#075e54", marginBottom: 2, textAlign: "right" },
  messageText: { fontSize: 15, color: "#000" },
  textMe: { textAlign: "left" },
  textOther: { textAlign: "right" },

  // صورة في الرسالة
  msgImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },

  // فيديو في الرسالة
  videoThumb: { width: 200, height: 120, borderRadius: 10, backgroundColor: "#000", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  videoPlayIcon: { fontSize: 36 },
  videoLabel: { color: "white", fontSize: 11, marginTop: 4 },

  msgFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  messageTime: { fontSize: 10, color: "#888" },
  emojiTrigger: { width: 20, height: 20, justifyContent: "center", alignItems: "center" },
  emojiPicker: { position: "absolute", bottom: 30, flexDirection: "row", backgroundColor: "white", borderRadius: 30, padding: 6, elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, zIndex: 100, gap: 6 },
  emojiPickerLeft: { left: 0 },
  emojiPickerRight: { right: 0 },
  emojiOption: { padding: 4 },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  reactionChip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  reactionChipActive: { backgroundColor: "#dcf8c6", borderWidth: 1, borderColor: "#075e54" },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: "bold", color: "#444" },
  systemMsgContainer: { alignSelf: "center", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginVertical: 8, maxWidth: "80%" },
  systemMsgText: { fontSize: 12, color: "#333", textAlign: "center" },

  inputWrapper: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 10, alignItems: "center", backgroundColor: "#e5ddd5", marginBottom: Platform.OS === 'android' ? 120 : 40, gap: 8 },
  textInput: { flex: 1, backgroundColor: "#fff", borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, minHeight: 45, maxHeight: 110 },
  sendCircle: { width: 50, height: 50, backgroundColor: "#075e54", borderRadius: 25, justifyContent: "center", alignItems: "center", elevation: 2 },
  mediaBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center", backgroundColor: "white", borderRadius: 22, elevation: 2 },

  // Preview Modal
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  previewClose: { position: "absolute", top: 50, right: 20, zIndex: 10, backgroundColor: "rgba(255,255,255,0.2)", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  previewCloseText: { color: "white", fontSize: 18, fontWeight: "bold" },
  previewImage: { width: "100%", height: "80%" },
  previewVideo: { width: "100%", height: 300 },

  // Duration Modal
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modalBox: { backgroundColor: "white", padding: 24, borderRadius: 16, width: 300 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#075e54", marginBottom: 16, textAlign: "right" },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 },
  durationTypeRow: { flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "flex-end" },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  typeChipActive: { backgroundColor: "#075e54", borderColor: "#075e54" },
  typeChipText: { fontSize: 13, color: "#666" },
  typeChipTextActive: { color: "white", fontWeight: "bold" },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalConfirm: { flex: 1, backgroundColor: "#075e54", padding: 12, borderRadius: 8, alignItems: "center" },
  modalConfirmText: { color: "white", fontWeight: "bold" },
  modalCancel: { flex: 1, backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8, alignItems: "center" },
  modalCancelText: { color: "#333", fontWeight: "bold" },
});