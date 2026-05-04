import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useRouter, useFocusEffect } from 'expo-router';

const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

const CATEGORIES = ["كتب", "دروس", "ملخصات", "أخرى"];

export default function AddProductScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear data on screen focus
  useFocusEffect(
    useCallback(() => {
      setTitle('');
      setPrice('');
      setCategory(CATEGORIES[0]);
      setImage(null);
    }, [])
  );

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
    const response = await fetch(uri);
    const blob = await response.blob();
    const data = new FormData();
    data.append('file', blob);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    data.append('folder', 'products');
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: data }
    );
    const result = await res.json();
    if (!res.ok) throw new Error(result.error?.message || 'Upload failed');
    return result.secure_url;
  };

  const handleAdd = async () => {
    if (!title.trim() || !price.trim() || !image) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول واختيار صورة');
      return;
    }
    const user = auth.currentUser;
    if (!user) { Alert.alert('خطأ', 'سجل دخول أولاً'); return; }

    setLoading(true);
    try {
      console.log('🚀 Starting upload...', image.uri);
      const imageURL = await uploadToCloudinary(image.uri);
      console.log('✅ Image uploaded:', imageURL);
      await addDoc(collection(db, 'products'), {
        title: title.trim(),
        price: parseFloat(price) || 0,
        category,
        imageURL,
        seller: user.email || '',
        sellerId: user.uid,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      console.log('✅ Product saved to Firestore');
      Alert.alert('تم ✅', 'تمت إضافة المنتج بنجاح');
      router.back();
    } catch (e: any) {
      console.error('❌ Error:', e);
      Alert.alert('خطأ', `فشل: ${e?.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🛍️ إضافة منتج جديد</Text>
        </View>

        <View style={styles.form}>
          {/* Image Picker */}
          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {image
              ? <Image source={{ uri: image.uri }} style={styles.image} />
              : <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>📷</Text>
                  <Text style={styles.imagePlaceholderText}>اختر صورة المنتج</Text>
                </View>
            }
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.label}>اسم المنتج</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="أدخل اسم المنتج"
            textAlign="right"
          />

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

          {/* Submit */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>➕ رفع المنتج</Text>
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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
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
