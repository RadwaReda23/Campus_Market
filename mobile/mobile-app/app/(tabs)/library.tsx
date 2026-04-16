// LibraryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, Alert, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useRouter } from 'expo-router';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface LibraryItem {
  id: string;
  title: string;
  imageURL: string;
  available?: boolean;
  borrower?: string | null;
  borrowStart?: string | null;
  borrowEnd?: string | null;
  lostDate?: string | null;
  owner?: string | null;
}

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'borrow' | 'lost'>('borrow');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [lostItems, setLostItems] = useState<LibraryItem[]>([]);
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [borrowStart, setBorrowStart] = useState('');
  const [borrowEnd, setBorrowEnd] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat State
  const [chatVisible, setChatVisible] = useState(false);
  const [chatItem, setChatItem] = useState<LibraryItem | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  // Chat Media State
  const [uploadingChatMedia, setUploadingChatMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);
  const [mediaMenuVisible, setMediaMenuVisible] = useState(false);

  const uploadChatMediaToCloudinary = async (uri: string, isVideo: boolean) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const data = new FormData();
    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", "chat_media");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`, {
      method: "POST",
      body: data,
    });
    const result = await res.json();
    if (!result.secure_url) throw new Error("Upload failed");
    return result.secure_url;
  };

  const sendChatMedia = async (uri: string, isVideo: boolean) => {
    if (!chatItem || !auth.currentUser) return;
    setUploadingChatMedia(true);
    try {
      const mediaURL = await uploadChatMediaToCloudinary(uri, isVideo);
      const colName = activeTab === 'borrow' ? 'library' : 'lost';
      await addDoc(collection(db, colName, chatItem.id, 'messages'), {
        sender: auth.currentUser?.email,
        text: "",
        mediaURL,
        mediaType: isVideo ? "video" : "image",
        createdAt: serverTimestamp()
      });
    } catch (e) {
      Alert.alert("خطأ", "فشل رفع الميديا");
    } finally {
      setUploadingChatMedia(false);
    }
  };

  const pickChatImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "مطلوب إذن المعرض"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) await sendChatMedia(result.assets[0].uri, false);
  };

  const pickChatVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "مطلوب إذن المعرض"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7, videoMaxDuration: 60 });
    if (!result.canceled) await sendChatMedia(result.assets[0].uri, true);
  };

  const openChatCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "مطلوب إذن الكاميرا"); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if (!result.canceled) {
      const isVideo = result.assets[0].type === "video";
      await sendChatMedia(result.assets[0].uri, isVideo);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const q1 = query(collection(db, "library"), orderBy("createdAt", "desc"));
      const snapshot1 = await getDocs(q1);
      const libList = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[];
      setLibraryItems(libList.filter(i => i.available !== undefined));

      const q2 = query(collection(db, "lost"), orderBy("createdAt", "desc"));
      const snapshot2 = await getDocs(q2);
      const lostList = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[];
      setLostItems(lostList);
    } catch {
      Alert.alert("خطأ", "فشل تحميل البيانات");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "محتاجين إذن الصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setImage({ uri: result.assets[0].uri });
  };

  const uploadToCloudinary = async () => {
    if (!image) return;
    const data = new FormData();
    const response = await fetch(image.uri);
    const blob = await response.blob();
    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", activeTab);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
    const result = await res.json();
    if (!res.ok) throw new Error("Upload failed");
    return result.secure_url;
  };

  const handleAddItem = async () => {
    if (!auth.currentUser) { Alert.alert("خطأ", "سجلي دخول الأول"); return; }
    if (!title || !image) { Alert.alert("تنبيه", "اكتب اسم المنتج واختار صورة"); return; }
    setLoading(true);
    try {
      const imageURL = await uploadToCloudinary();
      const colName = activeTab === 'borrow' ? "library" : "lost";
      const docData = activeTab === 'borrow'
        ? { title, imageURL, available: true, borrower: null, createdAt: serverTimestamp(), owner: auth.currentUser.email, borrowStart: borrowStart || null, borrowEnd: borrowEnd || null }
        : { title, imageURL, createdAt: serverTimestamp(), owner: auth.currentUser.email, lostDate: lostDate || null };
      await addDoc(collection(db, colName), docData);
      Alert.alert("تم ✅", "اتضاف بنجاح");
      setTitle(''); setImage(null); setBorrowStart(''); setBorrowEnd(''); setLostDate('');
      fetchItems();
    } catch { Alert.alert("خطأ", "حصل مشكلة"); }
    setLoading(false);
  };

  // Chat Functions
  const openChat = (item: LibraryItem, collectionName: string) => {
    setChatItem(item);
    setChatVisible(true);
    const q = query(collection(db, collectionName, item.id, 'messages'), orderBy('createdAt', 'asc'));
    onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setMessages(msgs);
    });
  };

  const sendMessage = async () => {
    if (!text.trim() || !chatItem) return;
    const colName = activeTab === 'borrow' ? 'library' : 'lost';
    await addDoc(collection(db, colName, chatItem.id, 'messages'), {
      sender: auth.currentUser?.email,
      text: text.trim(),
      createdAt: serverTimestamp()
    });
    setText('');
  };

  const filteredLibrary = libraryItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLost = lostItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderItems = (items: LibraryItem[], isBorrow: boolean) => (
    <View style={styles.contentRow}>
      <View style={styles.itemsList}>
        {items.map(item => {
          const isOwner = item.owner === auth.currentUser?.email;
          return (
            <View key={item.id} style={styles.itemRow}>
              {item.imageURL && <Image source={{ uri: item.imageURL }} style={styles.itemImage} />}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {isBorrow && <Text style={[styles.itemStatus, { color: item.available ? '#27ae60' : '#c0392b' }]}>{item.available ? '✅ متاح' : '❌ مستعار'}</Text>}
                {isBorrow && <Text style={styles.dateText}>{item.borrowStart && item.borrowEnd ? `📅 ${item.borrowStart} → ${item.borrowEnd}` : ''}</Text>}
                {!isBorrow && item.lostDate && <Text style={styles.dateText}>📅 الفقد: {item.lostDate}</Text>}
              </View>

              <View style={{ flexDirection: 'row', gap: 5 }}>
                {/* زر تعديل الحالة للمالك فقط */}
                {isBorrow && isOwner && (
                  <TouchableOpacity
                    style={[styles.borrowBtn, { backgroundColor: item.available ? '#1a3a2a' : '#c0392b' }]}
                    onPress={async () => {
                      try {
                        await updateDoc(doc(db, "library", item.id), { available: !item.available });
                        setLibraryItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
                      } catch { Alert.alert("خطأ", "فشل تحديث الحالة"); }
                    }}
                  >
                    <Text style={styles.borrowBtnText}>{item.available ? 'إخفاء كمستعار' : 'تحديد كمتاح'}</Text>
                  </TouchableOpacity>
                )}

                {/* زر الحذف للمالك فقط */}
                {isOwner && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={async () => {
                      try {
                        const colName = activeTab === 'borrow' ? "library" : "lost";
                        await deleteDoc(doc(db, colName, item.id));
                        if (activeTab === 'borrow') {
                          setLibraryItems(prev => prev.filter(i => i.id !== item.id));
                        } else {
                          setLostItems(prev => prev.filter(i => i.id !== item.id));
                        }
                        Alert.alert("تم الحذف ✅", "تم حذف العنصر بنجاح");
                      } catch (err) {
                        console.log("Delete error:", err);
                        Alert.alert("خطأ ❌", "فشل الحذف");
                      }
                    }}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ حذف</Text>
                  </TouchableOpacity>
                )}

                {/* زر الدردشة لكل شخص */}
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => openChat(item, activeTab === 'borrow' ? 'library' : 'lost')}
                >
                  <Text style={styles.chatBtnText}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* إضافة عناصر جديدة */}
      <View style={styles.addBox}>
        <TextInput placeholder="اسم المنتج" style={styles.input} value={title} onChangeText={setTitle} />
        {activeTab === 'borrow' ? (
          <>
            <TextInput placeholder="تاريخ بداية الاستعارة (YYYY-MM-DD)" style={styles.input} value={borrowStart} onChangeText={setBorrowStart} />
            <TextInput placeholder="تاريخ نهاية الاستعارة (YYYY-MM-DD)" style={styles.input} value={borrowEnd} onChangeText={setBorrowEnd} />
          </>
        ) : (
          <TextInput placeholder="تاريخ الفقد (YYYY-MM-DD)" style={styles.input} value={lostDate} onChangeText={setLostDate} />
        )}
        <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
          {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text>📷 اختاري صورة</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleAddItem}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>➕ إضافة</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>📚 المكتبة</Text></View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'borrow' && styles.tabActive]} onPress={() => { setActiveTab('borrow'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'borrow' && styles.tabTextActive]}>🥼 الاستعارة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'lost' && styles.tabActive]} onPress={() => { setActiveTab('lost'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>🔍 المفقودات</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="ابحث باسم المنتج"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {activeTab === 'borrow' ? renderItems(filteredLibrary, true) : renderItems(filteredLost, false)}
      </ScrollView>

      {/* CHAT OVERLAY */}
      {chatVisible && chatItem && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 10 }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={styles.modalBg}>
              <View style={styles.modalContent}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setChatVisible(false)}>
                  <Text style={styles.closeBtnText}>✖</Text>
                </TouchableOpacity>

                <FlatList
                  data={messages}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={() => (
                    <View style={{ paddingBottom: 10, borderBottomWidth: 1, borderColor: "#eee", marginBottom: 10 }}>
                      <Image source={{ uri: chatItem.imageURL }} style={styles.modalImage} />
                      <View style={styles.modalDetails}>
                        <Text style={styles.modalTitle}>{chatItem.title}</Text>
                        {chatItem.owner && chatItem.owner !== auth.currentUser?.email ? (
                          <TouchableOpacity onPress={() => router.push(`/userProfile?userEmail=${encodeURIComponent(chatItem.owner || '')}`)}>
                            <Text style={[styles.modalSeller, {color: '#1a3a2a', textDecorationLine: 'underline'}]}>
                              👤 المالك: {chatItem.owner} (اضغط للتقييم)
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.modalSeller}>
                            المالك: {chatItem.owner}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  renderItem={({ item }) => {
                    const isMe = item.sender === auth.currentUser?.email;
                    return (
                      <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                        {item.mediaType === "image" && item.mediaURL && (
                          <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "image" })}>
                            <Image source={{ uri: item.mediaURL }} style={styles.msgImage} resizeMode="cover" />
                          </TouchableOpacity>
                        )}

                        {item.mediaType === "video" && item.mediaURL && (
                          <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "video" })} style={styles.videoThumb}>
                            <Text style={styles.videoPlayIcon}>▶️</Text>
                            <Text style={styles.videoLabel}>اضغط لتشغيل الفيديو</Text>
                          </TouchableOpacity>
                        )}

                        {!!item.text && (
                          <Text style={[styles.msgText, isMe ? styles.txtMe : styles.txtOther]}>{item.text}</Text>
                        )}
                      </View>
                    );
                  }}
                />

                <View style={styles.quickMessageContainer}>
                  <TouchableOpacity onPress={() => setMediaMenuVisible(true)} style={styles.mediaBtn} disabled={uploadingChatMedia}>
                    {uploadingChatMedia ? (
                      <ActivityIndicator size="small" color="#1a3a2a" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>📎</Text>
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quickMessageInput}
                    value={text}
                    onChangeText={setText}
                    multiline
                    placeholder="اكتب رسالة..."
                  />
                  <TouchableOpacity style={styles.sendBtnLarge} onPress={sendMessage}>
                    <Text style={styles.sendBtnTextLarge}>إرسال</Text>
                  </TouchableOpacity>
                </View>

                {/* Media Menu */}
                {mediaMenuVisible && (
                  <TouchableOpacity style={styles.mediaMenuOverlay} activeOpacity={1} onPress={() => setMediaMenuVisible(false)}>
                    <View style={styles.mediaMenuBox}>
                      <Text style={styles.mediaMenuTitle}>اختر المرفق</Text>
                      
                      <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); pickChatImage(); }}>
                        <Text style={styles.mediaMenuBtnText}>📷 صورة من المعرض</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); pickChatVideo(); }}>
                        <Text style={styles.mediaMenuBtnText}>🎥 فيديو من المعرض</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); openChatCamera(); }}>
                        <Text style={styles.mediaMenuBtnText}>📸 كاميرا</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.mediaMenuBtn, styles.mediaMenuCancelBtn]} onPress={() => setMediaMenuVisible(false)}>
                        <Text style={styles.mediaMenuCancelText}>إلغاء</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}

              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Preview Modal للصور والفيديو */}
      {!!previewMedia && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 20 }]}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', margin: 16, gap: 10 },
  tab: { flex: 1, padding: 10, borderRadius: 20, borderWidth: 2, borderColor: '#ddd3c0', backgroundColor: 'white', alignItems: 'center' },
  tabActive: { backgroundColor: '#1a3a2a', borderColor: '#1a3a2a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8a7d6b' },
  tabTextActive: { color: 'white' },
  searchInput: { borderWidth: 3, borderColor: '#1a3a2a', margin: 16, marginBottom: 10, padding: 10, borderRadius: 10, fontSize: 14, textAlign: 'right', backgroundColor: '#fff' },
  contentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  itemsList: { flex: 3 },
  addBox: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', justifyContent: 'flex-start', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', marginBottom: 10, padding: 8, borderRadius: 8, textAlign: 'right', width: '100%' },
  imageBox: { height: 100, width: '100%', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  image: { width: '100%', height: '100%' },
  btn: { backgroundColor: '#1a3a2a', padding: 10, borderRadius: 8, alignItems: 'center', width: '100%' },
  btnText: { color: 'white' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 10 },
  itemImage: { width: 50, height: 50, borderRadius: 10 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#1a3a2a' },
  itemStatus: { fontSize: 11, marginTop: 2 },
  dateText: { fontSize: 10, color: '#555', marginTop: 2 },
  borrowBtn: { backgroundColor: '#1a3a2a', padding: 8, borderRadius: 8 },
  borrowBtnText: { color: 'white', fontSize: 11 },
  chatBtn: { backgroundColor: '#27ae60', padding: 8, borderRadius: 8 },
  chatBtnText: { color: 'white', fontSize: 12 },
  deleteBtn: { padding: 8, backgroundColor: '#e74c3c', borderRadius: 8, marginLeft: 5 },
  deleteBtnText: { color: 'white', fontSize: 12 },
  messageBox: { padding: 8, borderRadius: 8, marginVertical: 4, maxWidth: '70%' },
  myMsg: { backgroundColor: '#1a3a2a', alignSelf: 'flex-end' },
  otherMsg: { backgroundColor: '#ddd3c0', alignSelf: 'flex-start' },
  messageText: { color: 'white' },
  sender: { fontSize: 9, color: '#eee', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  sendBtn: { padding: 10, backgroundColor: '#1a3a2a', borderRadius: 8, marginLeft: 5 },

  // Chat Modal Styles like marketplace
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 40,
    maxHeight: "85%",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  closeBtnText: {
    fontSize: 24,
    color: "#555",
  },
  modalImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a3a2a",
    marginBottom: 10,
    textAlign: "right",
  },
  modalSeller: {
    fontSize: 14,
    color: "#777",
    marginBottom: 15,
    textAlign: "right",
  },
  msgBubble: {
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 15,
    marginVertical: 4,
    maxWidth: "80%",
  },
  msgMe: {
    backgroundColor: "#dcf8c6",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
  msgOther: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-end",
    borderTopRightRadius: 0,
  },
  msgText: {
    fontSize: 14,
    color: "#333",
  },
  txtMe: {
    textAlign: "left",
  },
  txtOther: {
    textAlign: "right",
  },
  quickMessageContainer: {
    flexDirection: "row-reverse",
    padding: 15,
    paddingBottom: Platform.OS === "android" ? 90 : 80,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
  quickMessageInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 45,
    maxHeight: 100,
    textAlign: "right",
    fontSize: 14,
  },
  sendBtnLarge: {
    backgroundColor: "#1a3a2a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnTextLarge: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  mediaBtn: {
    marginRight: 10,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  msgImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 5,
  },
  videoThumb: {
    width: 200,
    height: 150,
    backgroundColor: "#000",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 5,
  },
  videoPlayIcon: {
    fontSize: 40,
  },
  videoLabel: {
    color: "#fff",
    marginTop: 5,
    fontSize: 12,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
  previewVideo: {
    width: "100%",
    height: 300,
  },
  mediaMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 2000,
  },
  mediaMenuBox: {
    backgroundColor: "#fff",
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "android" ? 100 : 40,
  },
  mediaMenuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  mediaMenuBtn: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mediaMenuBtnText: {
    fontSize: 16,
    color: "#1a3a2a",
    textAlign: "center",
  },
  mediaMenuCancelBtn: {
    borderBottomWidth: 0,
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  mediaMenuCancelText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    fontWeight: "bold",
  },
});