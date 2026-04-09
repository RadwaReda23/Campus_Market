import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, TextInput, Alert, ActivityIndicator
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ☁️ Cloudinary
const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// ✅ Type
interface LibraryItem {
  id: string;
  title: string;
  imageURL: string;
  available: boolean;
  borrower?: string | null;
}

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState('borrow');

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLibrary();
  }, []);

  // 📦 fetch
  const fetchLibrary = async () => {
    try {
      const q = query(collection(db, "library"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LibraryItem[];

      setLibraryItems(list);
    } catch (err) {
      Alert.alert("خطأ", "فشل تحميل البيانات");
    }
  };

  // 📸 pick image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert("خطأ", "محتاجين إذن الصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage({ uri: result.assets[0].uri });
    }
  };

  // ☁️ upload
  const uploadToCloudinary = async () => {
    if (!image) return;

    const data = new FormData();

    const response = await fetch(image.uri);
    const blob = await response.blob();

    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", "library");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    const result = await res.json();

    if (!res.ok) throw new Error("Upload failed");

    return result.secure_url;
  };

  // ➕ add
  const handleAddItem = async () => {
    if (!auth.currentUser) {
      Alert.alert("خطأ", "سجلي دخول الأول");
      return;
    }

    if (!title || !image) {
      Alert.alert("تنبيه", "اكتبي اسم الحاجة واختاري صورة");
      return;
    }

    setLoading(true);

    try {
      const imageURL = await uploadToCloudinary();

      await addDoc(collection(db, "library"), {
        title,
        imageURL,
        available: true,
        borrower: null,
        createdAt: serverTimestamp(),
        owner: auth.currentUser.email
      });

      Alert.alert("تم ✅", "اتضاف بنجاح");

      setTitle('');
      setImage(null);

      fetchLibrary();

    } catch (err) {
      Alert.alert("خطأ", "حصل مشكلة");
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 المكتبة</Text>
      </View>

      <View style={styles.alertStrip}>
        <Text style={styles.alertText}>
          📚 المكتبة للاستعارة المجانية — أعد العناصر بعد الاستخدام
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'borrow' && styles.tabActive]}
          onPress={() => setActiveTab('borrow')}
        >
          <Text style={[styles.tabText, activeTab === 'borrow' && styles.tabTextActive]}>
            🥼 الاستعارة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.tabActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>
            🔍 المفقودات
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📚 الاستعارة */}
      {activeTab === 'borrow' && (
        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            🥼 عناصر الاستعارة — {libraryItems.filter(l => l.available).length} متاح
          </Text>

          {/* ➕ إضافة */}
          <TextInput
            placeholder="اسم الحاجة"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.image} />
            ) : (
              <Text>📷 اختاري صورة</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={handleAddItem}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>➕ إضافة للاستعارة</Text>
            )}
          </TouchableOpacity>

          {/* 📦 عرض */}
          {libraryItems.map((item: LibraryItem) => (
            <View key={item.id} style={styles.itemRow}>

              {item.imageURL && (
                <Image
                  source={{ uri: item.imageURL }}
                  style={{ width: 50, height: 50, borderRadius: 10 }}
                />
              )}

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>

                <Text style={[
                  styles.itemStatus,
                  { color: item.available ? '#27ae60' : '#c0392b' }
                ]}>
                  {item.available ? '✅ متاح' : '❌ مستعار'}
                </Text>
              </View>

              <TouchableOpacity style={styles.borrowBtn}>
                <Text style={styles.borrowBtnText}>استعر</Text>
              </TouchableOpacity>

            </View>
          ))}

        </View>
      )}

      {/* lost */}
      {activeTab === 'lost' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 المفقودات</Text>
        </View>
      )}

    </ScrollView>
  );
}

// 🎨 styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  alertStrip: {
    margin: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },

  alertText: { color: '#1a3a2a', fontSize: 13 },

  tabRow: { flexDirection: 'row', margin: 16, gap: 10 },

  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd3c0',
    backgroundColor: 'white',
    alignItems: 'center'
  },

  tabActive: { backgroundColor: '#1a3a2a', borderColor: '#1a3a2a' },

  tabText: { fontSize: 13, fontWeight: '600', color: '#8a7d6b' },

  tabTextActive: { color: 'white' },

  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd3c0'
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a3a2a',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd3c0'
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
    padding: 10,
    borderRadius: 8,
    textAlign: 'right'
  },

  imageBox: {
    height: 150,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center'
  },

  image: { width: '100%', height: '100%' },

  btn: {
    backgroundColor: '#1a3a2a',
    margin: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },

  btnText: { color: 'white' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe0',
    gap: 10
  },

  itemInfo: { flex: 1 },

  itemTitle: { fontSize: 13, fontWeight: '700', color: '#1a3a2a' },

  itemStatus: { fontSize: 11, marginTop: 2 },

  borrowBtn: {
    backgroundColor: '#1a3a2a',
    padding: 8,
    borderRadius: 8
  },

  borrowBtnText: { color: 'white', fontSize: 11 }
});