// LibraryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, Alert, ActivityIndicator, FlatList, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface LibraryItem {
  id: string;
  title: string;
  imageURL: string;
  available?: boolean;
  borrowStart?: string | null;
  borrowEnd?: string | null;
  lostDate?: string | null;
  owner?: string | null;
}

export default function LibraryScreen() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaMenuVisible, setMediaMenuVisible] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    const q1 = query(collection(db, "library"));
    const unsubLib = onSnapshot(q1, (snap) => {
      setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[]);
    });
    const q2 = query(collection(db, "lost"));
    const unsubLost = onSnapshot(q2, (snap) => {
      setLostItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[]);
    });
    return () => { unsubAuth(); unsubLib(); unsubLost(); };
  }, []);

  const uploadToCloudinary = async (uri: string, isVideo: boolean = false) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const data = new FormData();
    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", isVideo ? "chat_media" : activeTab);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`, { method: "POST", body: data });
    const result = await res.json();
    if (!res.ok) throw new Error("Upload failed");
    return result.secure_url;
  };

  const handleAddItem = async () => {
    if (!currentUser) { Alert.alert("خطأ", "سجل دخول أولاً"); return; }
    if (!title.trim() || !image) { Alert.alert("تنبيه", "أكمل البيانات"); return; }
    setLoading(true);
    try {
      const imageURL = await uploadToCloudinary(image.uri);
      const colName = activeTab === 'borrow' ? "library" : "lost";
      const docData = activeTab === 'borrow'
        ? { title: title.trim(), imageURL, available: true, createdAt: serverTimestamp(), owner: currentUser.email, borrowStart: borrowStart || null, borrowEnd: borrowEnd || null }
        : { title: title.trim(), imageURL, createdAt: serverTimestamp(), owner: currentUser.email, lostDate: lostDate || null };
      await addDoc(collection(db, colName), docData);
      Alert.alert("تم ✅", "تمت الإضافة");
      setTitle(''); setImage(null); setBorrowStart(''); setBorrowEnd(''); setLostDate('');
    } catch { Alert.alert("خطأ", "فشل الرفع"); } finally { setLoading(false); }
  };

  const sendMessage = async (mediaURL?: string, mediaType?: "image" | "video") => {
    if (!text.trim() && !mediaURL) return;
    if (!chatItem || !currentUser) return;
    const colName = activeTab === 'borrow' ? 'library' : 'lost';
    try {
      await addDoc(collection(db, colName, chatItem.id, 'messages'), {
        sender: currentUser.email,
        text: text.trim(),
        mediaURL: mediaURL || null,
        mediaType: mediaType || "text",
        createdAt: serverTimestamp()
      });
      setText('');
    } catch { Alert.alert("خطأ", "فشل الإرسال"); }
  };

  const pickChatMedia = async (type: 'image' | 'video' | 'camera') => {
    try {
      let result;
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos, quality: 0.7 });
      }
      if (!result.canceled) {
        setMediaMenuVisible(false);
        setUploadingMedia(true);
        const isVideo = result.assets[0].type === 'video';
        const url = await uploadToCloudinary(result.assets[0].uri, isVideo);
        await sendMessage(url, isVideo ? 'video' : 'image');
      }
    } catch { Alert.alert("خطأ", "فشل الرفع"); } finally { setUploadingMedia(false); }
  };

  const renderItems = (items: LibraryItem[], isBorrow: boolean) => (
    <View style={styles.contentRow} pointerEvents="box-none">
      <View style={styles.itemsList} pointerEvents="box-none">
        {items.map(item => {
          const isOwner = item.owner?.toLowerCase() === currentUser?.email?.toLowerCase();
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
                {isBorrow && isOwner && (
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: item.available ? '#1a3a2a' : '#c0392b' }]} onPress={() => updateDoc(doc(db, "library", item.id), { available: !item.available })}>
                    <Text style={styles.smallBtnText}>{item.available ? 'أعير' : 'متاح'}</Text>
                  </TouchableOpacity>
                )}
                {isOwner && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={async () => {
                    const colName = isBorrow ? "library" : "lost";
                    await deleteDoc(doc(db, colName, item.id));
                    if (isBorrow) setLibraryItems(prev => prev.filter(i => i.id !== item.id));
                    else setLostItems(prev => prev.filter(i => i.id !== item.id));
                    Alert.alert("تم ✅", "تم الحذف");
                  }}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.chatBtn} onPress={() => { setChatItem(item); setChatVisible(true); }}>
                  <Text style={styles.chatBtnText}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.addBox}>
        <TextInput placeholder="الاسم" style={styles.input} value={title} onChangeText={setTitle} />
        {activeTab === 'borrow' ? (
          <>
            <TextInput placeholder="البداية" style={styles.input} value={borrowStart} onChangeText={setBorrowStart} />
            <TextInput placeholder="النهاية" style={styles.input} value={borrowEnd} onChangeText={setBorrowEnd} />
          </>
        ) : <TextInput placeholder="تاريخ الفقد" style={styles.input} value={lostDate} onChangeText={setLostDate} />}
        <TouchableOpacity style={styles.imageBox} onPress={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
          if (!res.canceled) setImage({ uri: res.assets[0].uri });
        }}>
          {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text>📷 صورة</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleAddItem} disabled={loading}>{loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>➕ إضافة</Text>}</TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>📚 المكتبة</Text></View>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'borrow' && styles.tabActive]} onPress={() => setActiveTab('borrow')}>
          <Text style={[styles.tabText, activeTab === 'borrow' && styles.tabTextActive]}>🥼 الاستعارة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'lost' && styles.tabActive]} onPress={() => setActiveTab('lost')}>
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>🔍 المفقودات</Text>
        </TouchableOpacity>
      </View>
      <TextInput placeholder="ابحث باسم المنتج" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {activeTab === 'borrow' ? renderItems(libraryItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase())), true) : renderItems(lostItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase())), false)}
      </ScrollView>
      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setChatVisible(false)}><Text style={styles.closeBtnText}>✖</Text></TouchableOpacity>
              {chatItem && (
                <FlatList data={messages} keyExtractor={item => item.id} renderItem={({ item }) => {
                  const isMe = item.sender === currentUser?.email;
                  return (
                    <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                      {item.mediaType === "image" && item.mediaURL && <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "image" })}><Image source={{ uri: item.mediaURL }} style={styles.msgImage} /></TouchableOpacity>}
                      {item.mediaType === "video" && item.mediaURL && <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "video" })} style={styles.videoThumb}><Text style={{ fontSize: 36 }}>▶️</Text></TouchableOpacity>}
                      {!!item.text && <Text style={[styles.msgText, isMe ? styles.txtMe : styles.txtOther]}>{item.text}</Text>}
                    </View>
                  );
                }} />
              )}
              <View style={styles.quickMessageContainer}>
                <TouchableOpacity onPress={() => setMediaMenuVisible(true)} style={styles.mediaBtn} disabled={uploadingMedia}>{uploadingMedia ? <ActivityIndicator size="small" /> : <Text style={{ fontSize: 22 }}>📎</Text>}</TouchableOpacity>
                <TextInput style={styles.quickMessageInput} value={text} onChangeText={setText} placeholder="اكتب رسالة..." />
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}><Text style={styles.sendBtnText}>إرسال</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {previewMedia && (
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewMedia(null)}><Text style={styles.previewCloseText}>✕</Text></TouchableOpacity>
          {previewMedia.type === "image" ? <Image source={{ uri: previewMedia.uri }} style={styles.previewImage} resizeMode="contain" /> : <Video source={{ uri: previewMedia.uri }} style={styles.previewVideo} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />}
        </View>
      )}
      {mediaMenuVisible && (
        <TouchableOpacity style={styles.mediaMenuOverlay} activeOpacity={1} onPress={() => setMediaMenuVisible(false)}>
          <View style={styles.mediaMenuBox}>
            <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => pickChatMedia('image')}><Text style={styles.mediaMenuBtnText}>📷 صورة</Text></TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => pickChatMedia('video')}><Text style={styles.mediaMenuBtnText}>🎥 فيديو</Text></TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => pickChatMedia('camera')}><Text style={styles.mediaMenuBtnText}>📸 كاميرا</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', padding: 16, gap: 10 },
  tab: { flex: 1, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white', alignItems: 'center' },
  tabActive: { backgroundColor: '#1a3a2a' },
  tabText: { fontSize: 13, color: '#888' },
  tabTextActive: { color: 'white' },
  searchInput: { borderWidth: 1, borderColor: '#ddd', margin: 16, padding: 10, borderRadius: 10, backgroundColor: '#fff', textAlign: 'right' },
  contentRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  itemsList: { flex: 2.5 },
  addBox: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  input: { borderWidth: 1, borderColor: '#eee', marginBottom: 8, padding: 8, borderRadius: 5, textAlign: 'right' },
  imageBox: { height: 80, borderWidth: 1, borderColor: '#eee', borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  image: { width: '100%', height: '100%', borderRadius: 5 },
  btn: { backgroundColor: '#1a3a2a', padding: 10, borderRadius: 5, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center', gap: 10 },
  itemImage: { width: 45, height: 45, borderRadius: 5 },
  itemInfo: { flex: 1 },
  itemTitle: { fontWeight: 'bold', fontSize: 14, color: '#1a3a2a' },
  itemStatus: { fontSize: 11 },
  dateText: { fontSize: 10, color: '#777' },
  smallBtn: { padding: 5, borderRadius: 5 },
  smallBtnText: { color: 'white', fontSize: 10 },
  chatBtn: { backgroundColor: '#27ae60', padding: 5, borderRadius: 5 },
  chatBtnText: { color: 'white', fontSize: 12 },
  deleteBtn: { backgroundColor: '#e74c3c', padding: 5, borderRadius: 5 },
  deleteBtnText: { color: 'white', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', padding: 15 },
  closeBtn: { alignSelf: 'flex-end', padding: 5 },
  closeBtnText: { fontSize: 20 },
  msgBubble: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: '80%' },
  msgMe: { backgroundColor: '#dcf8c6', alignSelf: 'flex-start' },
  msgOther: { backgroundColor: '#f0f0f0', alignSelf: 'flex-end' },
  msgText: { fontSize: 14 },
  txtMe: { textAlign: 'left' },
  txtOther: { textAlign: 'right' },
  quickMessageContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#eee' },
  quickMessageInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, textAlign: 'right' },
  sendBtn: { backgroundColor: '#1a3a2a', padding: 10, borderRadius: 20 },
  sendBtnText: { color: '#white', fontWeight: 'bold' },
  mediaBtn: { padding: 10 },
  msgImage: { width: 150, height: 150, borderRadius: 10 },
  videoThumb: { width: 150, height: 100, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  previewClose: { position: 'absolute', top: 40, right: 20, zIndex: 11 },
  previewCloseText: { color: 'white', fontSize: 30 },
  previewImage: { width: '100%', height: '100%' },
  previewVideo: { width: '100%', height: '100%' },
  mediaMenuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  mediaMenuBox: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '80%' },
  mediaMenuBtn: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  mediaMenuBtnText: { textAlign: 'center', fontSize: 16 }
});