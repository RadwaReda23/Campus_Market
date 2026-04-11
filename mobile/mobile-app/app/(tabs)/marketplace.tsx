import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, FlatList, Modal, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Colors, Fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';

// ☁️ Cloudinary Config
const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  imageURL: string;
  seller: string;
  sellerId: string;
  sellerType?: string;
  condition?: string;
  status: string;
  views: number;
  createdAt?: any;
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', price: '', category: 'كتب', sellerType: 'طالب', condition: 'جيد' });
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = ["الكل", "كتب", "معدات", "ملابس", "أدوات", "أخرى"];
  const conditions = ["ممتاز", "جيد جداً", "جيد", "مقبول"];

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(list);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesFilter = activeFilter === 'الكل' || p.category === activeFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "نحتاج إذن الوصول للصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const uploadToCloudinary = async (pickedImage: any) => {
    const data = new FormData();
    const response = await fetch(pickedImage.uri);
    const blob = await response.blob();
    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url;
  };

  const handleAddProduct = async () => {
    if (!auth.currentUser) return;
    if (!form.title || !form.price || (!image && !editingProduct)) {
      Alert.alert("تنبيه", "الرجاء ملء كل الحقول واختيار صورة");
      return;
    }
    setLoading(true);
    try {
      let uploadedUrl = editingProduct?.imageURL || "";
      if (image) uploadedUrl = await uploadToCloudinary(image);

      const productData = {
        title: form.title,
        price: Number(form.price),
        category: form.category,
        sellerType: form.sellerType,
        condition: form.condition,
        imageURL: uploadedUrl,
        seller: auth.currentUser.displayName || auth.currentUser.email,
        sellerId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
        status: editingProduct?.status || "active",
        views: editingProduct?.views || 0,
      };

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        Alert.alert("تم ✅", "تم تحديث المنتج");
      } else {
        await addDoc(collection(db, "products"), { ...productData, createdAt: serverTimestamp(), views: 0 });
        Alert.alert("تم ✅", "تم إضافة المنتج");
      }
      setForm({ title: '', price: '', category: 'كتب', sellerType: 'طالب', condition: 'جيد' });
      setImage(null);
      setShowAddModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      Alert.alert("خطأ", "فشل العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    Alert.alert("حذف", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
        await deleteDoc(doc(db, "products", id));
        Alert.alert("تم الحذف");
      }}
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.imageURL }} style={styles.cardImage} />
        <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeSold]}>
          <Text style={styles.badgeText}>{item.status === 'active' ? 'متاح' : 'تم البيع'}</Text>
        </View>
        <View style={styles.conditionChip}>
           <Text style={styles.conditionText}>{item.condition || 'جيد'}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.categorySub}>{item.category}</Text>
        <Text style={styles.cardPrice}>{item.price} <Text style={styles.currency}>جنيه</Text></Text>
        <View style={styles.sellerRow}>
          <View style={{flex: 1, alignItems: 'flex-end'}}>
             <Text style={styles.cardSeller} numberOfLines={1}>👤 {item.seller}</Text>
             <Text style={[styles.typeBadge, styles[`type${item.sellerType}` as keyof typeof styles]]}>{item.sellerType || 'طالب'}</Text>
          </View>
          {auth.currentUser?.uid !== item.sellerId ? (
             <TouchableOpacity style={styles.miniChatBtn} onPress={() => router.push('/messages')}>
                <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>💬</Text>
             </TouchableOpacity>
          ) : (
            <View style={styles.ownerActions}>
               <Text style={styles.viewsText}>👁 {item.views}</Text>
               <TouchableOpacity onPress={() => { setEditingProduct(item); setForm({ ...item, price: item.price.toString() } as any); setShowAddModal(true); }}>
                  <Text style={{fontSize: 14}}>✏️</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => handleDeleteProduct(item.id)}>
                  <Text style={{fontSize: 14}}>🗑️</Text>
               </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Mirror Topbar */}
      <View style={styles.topbar}>
         <Text style={styles.pageTitle}>🛒 المنتجات</Text>
         <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ إضافة منتج</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في المنتجات..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.muted}
          />
        </View>
      </View>

      <View style={{ height: 50, marginTop: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {filters.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={<Text style={styles.resultCount}>عرض {filteredProducts.length} منتج</Text>}
      />

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? "✏️ تعديل" : "➕ إضافة"}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setEditingProduct(null); }}><Text style={styles.closeModal}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
                {(image || editingProduct?.imageURL) ? (
                  <Image source={{ uri: image ? image.uri : editingProduct?.imageURL }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}><Text style={{ fontSize: 40 }}>📷</Text><Text style={{ color: Colors.light.muted, marginTop: 8 }}>اضغط لاختيار صورة</Text></View>
                )}
              </TouchableOpacity>
              <Text style={styles.label}>اسم المنتج *</Text>
              <TextInput placeholder="كتاب، لاب توب، إلخ" style={styles.input} value={form.title} onChangeText={t => setForm({ ...form, title: t })} />
              <Text style={styles.label}>السعر (جنيه) *</Text>
              <TextInput placeholder="0" style={styles.input} keyboardType="numeric" value={form.price} onChangeText={p => setForm({ ...form, price: p })} />
              
              <Text style={styles.label}>الحالة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row-reverse'}}>
                 {conditions.map(c => (
                   <TouchableOpacity key={c} style={[styles.condChip, form.condition === c && styles.condChipActive]} onPress={() => setForm({...form, condition: c})}>
                      <Text style={[styles.condText, form.condition === c && styles.condTextActive]}>{c}</Text>
                   </TouchableOpacity>
                 ))}
              </ScrollView>

              <TouchableOpacity style={[styles.submitBtn]} onPress={handleAddProduct} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>✅ حفظ المنتج</Text>}
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
  searchInput: { flex: 1, textAlign: 'right', fontSize: 13, fontFamily: Fonts.cairo, color: Colors.light.primary },
  listContent: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: 'white', marginHorizontal: 4, borderWidth: 1, borderColor: Colors.light.border, height: 34, justifyContent: 'center' },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterText: { fontSize: 11, color: Colors.light.muted, fontFamily: Fonts.cairoBold },
  filterTextActive: { color: 'white' },
  resultCount: { color: Colors.light.muted, fontSize: 10, fontFamily: Fonts.cairoBold, marginBottom: 10, paddingHorizontal: 5 },
  card: { width: '48%', backgroundColor: Colors.light.cardBg, borderRadius: 14, marginBottom: 15, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden', elevation: 2 },
  cardImageContainer: { height: 120, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeActive: { backgroundColor: '#d4f4e0' },
  badgeSold: { backgroundColor: '#fde8e8' },
  badgeText: { fontSize: 8, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  conditionChip: { position: 'absolute', bottom: 6, left: 6, backgroundColor: Colors.light.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  conditionText: { color: Colors.light.muted, fontSize: 8, fontFamily: Fonts.cairoBold },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontFamily: Fonts.cairoBold, color: Colors.light.primary, textAlign: 'right' },
  categorySub: { fontSize: 9, color: Colors.light.muted, fontFamily: Fonts.cairo, textAlign: 'right' },
  cardPrice: { fontSize: 16, fontFamily: Fonts.cairoExtraBold, color: Colors.light.accent, marginTop: 4, textAlign: 'right' },
  currency: { fontSize: 10, fontWeight: 'normal', color: Colors.light.muted },
  sellerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 6 },
  cardSeller: { fontSize: 10, color: Colors.light.primary, textAlign: 'right', fontFamily: Fonts.cairoBold },
  typeBadge: { fontSize: 8, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, color: 'white', fontFamily: Fonts.cairoBold, marginTop: 2 },
  typeطالب: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  typeدكتور: { backgroundColor: '#fce7f3', color: '#be185d' },
  typeخريج: { backgroundColor: '#dcfce7', color: '#15803d' },
  miniChatBtn: { backgroundColor: Colors.light.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  ownerActions: { flexDirection: 'row-reverse', gap: 6, alignItems: 'center' },
  viewsText: { fontSize: 8, color: Colors.light.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  closeModal: { fontSize: 20, color: Colors.light.muted },
  label: { fontSize: 11, fontFamily: Fonts.cairoBold, color: Colors.light.muted, marginTop: 12, marginBottom: 6, textAlign: 'right' },
  imageBox: { height: 140, backgroundColor: '#f9f9f9', borderRadius: 16, borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', padding: 10, borderRadius: 10, textAlign: 'right', fontFamily: Fonts.cairo, fontSize: 14 },
  condChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f5f5f5', marginLeft: 8, borderWidth: 1, borderColor: '#eee' },
  condChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  condText: { fontSize: 10, fontFamily: Fonts.cairo, color: '#666' },
  condTextActive: { color: 'white', fontFamily: Fonts.cairoBold },
  submitBtn: { backgroundColor: Colors.light.primary, padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  submitBtnText: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 14 }
});
