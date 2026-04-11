import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Colors, Fonts } from '@/constants/theme';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface LibraryItem {
  id: string;
  title: string;
  imageURL: string;
  available?: boolean;
  ownerId?: string | null;
  description?: string;
  location?: string;
  finder?: string;
  finderId?: string;
  claimed?: boolean;
  date?: string;
}

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<'borrow' | 'lost'>('borrow');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [lostItems, setLostItems] = useState<LibraryItem[]>([]);
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsubLib = onSnapshot(query(collection(db, "library"), orderBy("createdAt", "desc")), (snap) => {
       setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[]);
    });
    const unsubLost = onSnapshot(query(collection(db, "lostFound"), orderBy("createdAt", "desc")), (snap) => {
       setLostItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[]);
    });
    return () => { unsubLib(); unsubLost(); };
  }, []);

  const handleAddItem = async () => {
    if (!auth.currentUser || !title || !image) return;
    setLoading(true);
    try {
      // Cloudinary upload logic simplified
      let imageURL = ""; 
      const data = new FormData();
      const response = await fetch(image.uri);
      const blob = await response.blob();
      data.append("file", blob);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const result = await res.json();
      imageURL = result.secure_url;

      const col = activeTab === 'borrow' ? "library" : "lostFound";
      const itemData = activeTab === 'borrow' ? {
        title, imageURL, available: true, owner: auth.currentUser.displayName, ownerId: auth.currentUser.uid, createdAt: serverTimestamp()
      } : {
        title, description, location, imageURL, claimed: false, finder: auth.currentUser.displayName, finderId: auth.currentUser.uid, date: "الآن", createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, col), itemData);
      setShowAddModal(false);
      setTitle(''); setImage(null);
    } catch { Alert.alert("خطأ", "فشل الإرسال"); }
    finally { setLoading(false); }
  };

  const renderItemCard = ({ item }: { item: LibraryItem }) => {
    const isLost = activeTab === 'lost';
    const canManage = isLost ? (item.finderId === auth.currentUser?.uid) : (item.ownerId === auth.currentUser?.uid);

    return (
      <View style={styles.card}>
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: item.imageURL }} style={styles.cardImage} />
          <View style={[styles.badge, (isLost ? !item.claimed : item.available) ? styles.badgeActive : styles.badgeSold]}>
            <Text style={styles.badgeText}>{isLost ? (item.claimed ? 'تم الاسترداد' : 'مفقود') : (item.available ? 'متاح' : 'مستعار')}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {isLost && (
            <>
               <Text style={styles.lostDesc} numberOfLines={2}>{item.description}</Text>
               <View style={styles.tagRow}>
                  <Text style={styles.tag}>📍 {item.location}</Text>
                  <Text style={styles.tag}>👤 {item.finder}</Text>
               </View>
            </>
          )}
          {!isLost && (
             <Text style={styles.priceTag}>مجاني للاستعارة</Text>
          )}
          <View style={styles.cardActions}>
            {canManage && (
              <TouchableOpacity
                style={styles.actionBtnMe}
                onPress={() => updateDoc(doc(db, isLost ? "lostFound" : "library", item.id), isLost ? { claimed: !item.claimed } : { available: !item.available })}
              >
                <Text style={styles.actionBtnText}>{isLost ? (item.claimed ? 'فتح' : 'قفل') : (item.available ? 'إعارة' : 'إرجاع')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtnOther} onPress={() => Alert.alert("تواصل", "تواصل مع المالك لتحديد موعد")}>
               <Text style={styles.actionBtnTextOther}>💬 تواصل</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mirror Topbar */}
      <View style={styles.topbar}>
         <Text style={styles.pageTitle}>{activeTab === 'borrow' ? '📚 المكتبة' : '🔍 المفقودات'}</Text>
         <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ إضافة</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="ابحث..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'borrow' && styles.tabActive]} onPress={() => setActiveTab('borrow')}>
          <Text style={[styles.tabLabel, activeTab === 'borrow' && styles.tabLabelActive]}>📦 استعارة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'lost' && styles.tabActive]} onPress={() => setActiveTab('lost')}>
          <Text style={[styles.tabLabel, activeTab === 'lost' && styles.tabLabelActive]}>🔍 مفقودات</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={(activeTab === 'borrow' ? libraryItems : lostItems).filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))} 
        keyExtractor={item => item.id} 
        renderItem={renderItemCard} 
        numColumns={2} 
        contentContainerStyle={styles.listContent} 
        columnWrapperStyle={styles.columnWrapper} 
      />
      
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
           {/* Reuse logic from Marketplace for parity modal UX */}
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>➕ إضافة عنصر</Text>
                 <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={{fontSize:20}}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView>
                 <TouchableOpacity style={styles.imageBox} onPress={async () => {
                    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
                    if(!res.canceled) setImage({uri: res.assets[0].uri});
                 }}>
                    {image ? <Image source={{uri: image.uri}} style={{width:'100%', height:'100%', borderRadius:12}} /> : <Text>📷 اختر صورة</Text>}
                 </TouchableOpacity>
                 <Text style={styles.label}>العنوان</Text>
                 <TextInput style={styles.input} value={title} onChangeText={setTitle} />
                 {activeTab === 'lost' && (
                    <>
                       <Text style={styles.label}>المكان</Text>
                       <TextInput style={styles.input} value={location} onChangeText={setLocation} />
                       <Text style={styles.label}>الوصف</Text>
                       <TextInput style={[styles.input, {height:60}]} multiline value={description} onChangeText={setDescription} />
                    </>
                 )}
                 <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>إضافة</Text>}
                 </TouchableOpacity>
              </ScrollView>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topbar: { backgroundColor: 'white', borderBottomWidth: 2, borderBottomColor: Colors.light.border, paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 18, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  addBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 11 },
  searchSection: { paddingHorizontal: 15, marginTop: 15 },
  searchContainer: { flexDirection: 'row-reverse', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', height: 44, borderWidth: 1, borderColor: Colors.light.border },
  searchIcon: { fontSize: 16, marginLeft: 8 },
  searchInput: { flex: 1, textAlign: 'right', fontSize: 13, fontFamily: Fonts.cairo },
  tabBar: { flexDirection: 'row-reverse', paddingHorizontal: 15, marginTop: 15, gap: 10 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  tabLabel: { fontSize: 11, fontFamily: Fonts.cairoBold, color: Colors.light.muted },
  tabLabelActive: { color: 'white' },
  listContent: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: Colors.light.cardBg, borderRadius: 14, marginBottom: 15, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden', elevation: 2 },
  cardImageContainer: { height: 110, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeActive: { backgroundColor: '#d4f4e0' },
  badgeSold: { backgroundColor: '#fde8e8' },
  badgeText: { fontSize: 8, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 12, fontFamily: Fonts.cairoBold, color: Colors.light.primary, textAlign: 'right' },
  priceTag: { fontSize: 10, color: Colors.light.accent, fontFamily: Fonts.cairoBold, textAlign: 'right', marginTop: 4 },
  lostDesc: { fontSize: 9, color: Colors.light.muted, fontFamily: Fonts.cairo, textAlign: 'right', height: 26 },
  tagRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tag: { fontSize: 8, color: '#888', backgroundColor: '#f9f9f9', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, fontFamily: Fonts.cairoBold },
  cardActions: { flexDirection: 'row-reverse', marginTop: 10, gap: 5 },
  actionBtnMe: { flex: 1, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.light.primary, alignItems: 'center' },
  actionBtnOther: { flex: 1, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.light.accent, alignItems: 'center' },
  actionBtnText: { color: 'white', fontSize: 8, fontFamily: Fonts.cairoBold },
  actionBtnTextOther: { color: Colors.light.primary, fontSize: 8, fontFamily: Fonts.cairoBold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cairoBold },
  imageBox: { height: 140, backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#888', justifyContent: 'center', alignItems: 'center', marginVertical: 15 },
  label: { fontSize: 11, fontFamily: Fonts.cairoBold, color: '#888', textAlign: 'right', marginTop: 10 },
  input: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8, textAlign: 'right', fontFamily: Fonts.cairo },
  submitBtn: { backgroundColor: Colors.light.primary, padding: 14, borderRadius: 12, marginTop: 25, alignItems: 'center' },
  submitBtnText: { color: 'white', fontFamily: Fonts.cairoBold }
});