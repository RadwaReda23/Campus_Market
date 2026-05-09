import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

const CATEGORIES = ["كتب", "دروس", "ملخصات", "أخرى"];

export default function AddProductScreen() {
  const router = useRouter();
  const { editId, type = 'products' } = useLocalSearchParams<{ editId?: string, type?: string }>();
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [borrowStart, setBorrowStart] = useState('');
  const [borrowEnd, setBorrowEnd] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Load data if editing
  useEffect(() => {
    if (editId) {
      const fetchData = async () => {
        setFetching(true);
        try {
          const docRef = doc(db, type as string, editId as string);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setTitle(data.title || '');
            setImage(data.imageURL ? { uri: data.imageURL } : null);
            if (type === 'products') {
              setPrice(data.price?.toString() || '');
              setCategory(data.category || CATEGORIES[0]);
            } else if (type === 'library') {
              setBorrowStart(data.borrowStart || '');
              setBorrowEnd(data.borrowEnd || '');
            } else if (type === 'lost') {
              setLostDate(data.lostDate || '');
            }
          }
        } catch (e) {
          console.error(e);
          Alert.alert("خطأ", "فشل تحميل بيانات المنتج");
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    }
  }, [editId, type]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('خطأ', 'نحتاج إذن الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImage({ uri: result.assets[0].uri });
  };

  const uploadToCloudinary = async (uri: string) => {
    if (uri.startsWith('http')) return uri; // Already uploaded
    const response = await fetch(uri);
    const blob = await response.blob();
    const data = new FormData();
    data.append('file', blob);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    data.append('folder', type);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: data }
    );
    const result = await res.json();
    if (!res.ok) throw new Error(result.error?.message || 'Upload failed');
    return result.secure_url;
  };

  const handleSave = async () => {
    if (!title.trim() || !image) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول واختيار صورة');
      return;
    }
    const user = auth.currentUser;
    if (!user) { Alert.alert('خطأ', 'سجل دخول أولاً'); return; }

    setLoading(true);
    try {
      const imageURL = await uploadToCloudinary(image.uri);
      
      const docData: any = {
        title: title.trim(),
        imageURL,
        updatedAt: serverTimestamp(),
      };

      if (type === 'products') {
        docData.price = parseFloat(price) || 0;
        docData.category = category;
      } else if (type === 'library') {
        docData.borrowStart = borrowStart;
        docData.borrowEnd = borrowEnd;
      } else if (type === 'lost') {
        docData.lostDate = lostDate;
      }

      if (editId) {
        await updateDoc(doc(db, type as string, editId as string), docData);
        Alert.alert('تم ✅', 'تم تحديث البيانات بنجاح');
      } else {
        docData.createdAt = serverTimestamp();
        docData.seller = user.email || '';
        docData.sellerId = user.uid;
        if (type === 'products') docData.status = 'active';
        if (type === 'library') {
            docData.available = true;
            docData.owner = user.email;
        }
        if (type === 'lost') docData.owner = user.email;
        
        await addDoc(collection(db, type as string), docData);
        Alert.alert('تم ✅', 'تمت الإضافة بنجاح');
      }
      router.back();
    } catch (e: any) {
      console.error('❌ Error:', e);
      Alert.alert('خطأ', `فشل العملية: ${e?.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1a3a2a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editId ? '✏️ تعديل' : '➕ إضافة'} {type === 'products' ? 'منتج' : type === 'library' ? 'عنصر استعارة' : 'مفقودات'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Image Picker */}
          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {image
              ? <Image source={{ uri: image.uri }} style={styles.image} />
              : <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>📷</Text>
                  <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                </View>
            }
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="أدخل الاسم"
            textAlign="right"
          />

          {type === 'products' && (
            <>
              {/* Price */}
              <Text style={styles.label}>السعر (ج.م)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                keyboardType="numeric"
                textAlign="right"
              />

              {/* Category */}
              <Text style={styles.label}>الفئة</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {type === 'library' && (
            <>
              <Text style={styles.label}>تاريخ بداية الاستعارة (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={borrowStart}
                onChangeText={setBorrowStart}
                placeholder="مثال: 2024-05-10"
                textAlign="right"
              />
              <Text style={styles.label}>تاريخ نهاية الاستعارة (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={borrowEnd}
                onChangeText={setBorrowEnd}
                placeholder="مثال: 2024-05-20"
                textAlign="right"
              />
            </>
          )}

          {type === 'lost' && (
            <>
              <Text style={styles.label}>تاريخ الفقد</Text>
              <TextInput
                style={styles.input}
                value={lostDate}
                onChangeText={setLostDate}
                placeholder="مثال: اليوم"
                textAlign="right"
              />
            </>
          )}

          {/* Submit */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>{editId ? '💾 حفظ التعديلات' : '➕ رفع الآن'}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 55 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: '#c8a84b', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  imageBox: {
    width: '100%', height: 200, borderRadius: 12,
    backgroundColor: '#fff', marginBottom: 20,
    overflow: 'hidden', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderIcon: { fontSize: 48 },
  imagePlaceholderText: { color: '#999', marginTop: 8, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 16,
  },
  categoryRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#e0e0e0', borderWidth: 1, borderColor: '#ddd',
  },
  categoryBtnActive: { backgroundColor: '#1a3a2a', borderColor: '#1a3a2a' },
  categoryBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  categoryBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#27ae60', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
