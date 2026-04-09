// LibraryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface LibraryItem { id: string; title: string; imageURL: string; available?: boolean; borrower?: string | null; }

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<'borrow' | 'lost'>('borrow');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [lostItems, setLostItems] = useState<LibraryItem[]>([]);
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Chat Modal State ---
  const [chatVisible, setChatVisible] = useState(false);
  const [chatItem, setChatItem] = useState<LibraryItem | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

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
    if (!title || !image) { Alert.alert("تنبيه", "اكتبي اسم الحاجة واختاري صورة"); return; }
    setLoading(true);
    try {
      const imageURL = await uploadToCloudinary();
      const colName = activeTab === 'borrow' ? "library" : "lost";
      const docData = activeTab === 'borrow'
        ? { title, imageURL, available: true, borrower: null, createdAt: serverTimestamp(), owner: auth.currentUser.email }
        : { title, imageURL, createdAt: serverTimestamp(), owner: auth.currentUser.email };
      await addDoc(collection(db, colName), docData);
      Alert.alert("تم ✅", "اتضاف بنجاح");
      setTitle(''); setImage(null);
      fetchItems();
    } catch { Alert.alert("خطأ", "حصل مشكلة"); }
    setLoading(false);
  };

  // --- Chat Functions ---
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
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            {item.imageURL && <Image source={{ uri: item.imageURL }} style={styles.itemImage} />}
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {isBorrow && <Text style={[styles.itemStatus, { color: item.available ? '#27ae60' : '#c0392b' }]}>{item.available ? '✅ متاح' : '❌ مستعار'}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {isBorrow && <TouchableOpacity style={styles.borrowBtn}><Text style={styles.borrowBtnText}>استعر</Text></TouchableOpacity>}
              <TouchableOpacity 
                style={styles.chatBtn}
                onPress={() => openChat(item, activeTab === 'borrow' ? 'library' : 'lost')}
              >
                <Text style={styles.chatBtnText}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.addBox}>
        <TextInput placeholder="اسم الحاجة" style={styles.input} value={title} onChangeText={setTitle} />
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

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'borrow' && styles.tabActive]} onPress={() => { setActiveTab('borrow'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'borrow' && styles.tabTextActive]}>🥼 الاستعارة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'lost' && styles.tabActive]} onPress={() => { setActiveTab('lost'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>🔍 المفقودات</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="ابحث باسم الحاجة"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {activeTab === 'borrow' ? renderItems(filteredLibrary, true) : renderItems(filteredLost, false)}
      </ScrollView>

      {/* --- Chat Modal --- */}
      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <View style={{ flex:1, backgroundColor:'#f5f0e8', padding:10 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:16, fontWeight:'bold' }}>{chatItem?.title}</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)}><Text style={{fontSize:18}}>❌</Text></TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.messageBox, item.sender === auth.currentUser?.email ? styles.myMsg : styles.otherMsg]}>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.sender}>{item.sender}</Text>
              </View>
            )}
            style={{ flex:1, marginTop:10 }}
          />

          <View style={styles.inputRow}>
            <TextInput value={text} onChangeText={setText} style={styles.input} placeholder="اكتب رسالة..." />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}><Text style={{color:'white'}}>إرسال</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
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
  borrowBtn: { backgroundColor: '#1a3a2a', padding: 8, borderRadius: 8 },
  borrowBtnText: { color: 'white', fontSize: 11 },
  chatBtn: { backgroundColor: '#27ae60', padding: 8, borderRadius: 8 },
  chatBtnText: { color: 'white', fontSize: 12 },
  messageBox: { padding:8, borderRadius:8, marginVertical:4, maxWidth:'70%' },
  myMsg: { backgroundColor:'#1a3a2a', alignSelf:'flex-end' },
  otherMsg: { backgroundColor:'#ddd3c0', alignSelf:'flex-start' },
  messageText: { color:'white' },
  sender: { fontSize:9, color:'#eee', marginTop:2 },
  inputRow: { flexDirection:'row', alignItems:'center', marginTop:5 },
  sendBtn: { padding:10, backgroundColor:'#1a3a2a', borderRadius:8, marginLeft:5 }
});