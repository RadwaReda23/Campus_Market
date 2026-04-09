import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setName(user.displayName || '');
        setEmail(user.email || '');
        setPhoto(user.photoURL || null);

        fetchMyProducts(user.uid);
      }
    });

    return unsubscribe;
  }, []);

  // 📦 جلب منتجات المستخدم
  const fetchMyProducts = async (uid: string) => {
    try {
      const q = query(
        collection(db, "products"),
        where("sellerId", "==", uid)
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(list);
    } catch (err) {
      console.log("Error loading products:", err);
    }
  };

  // 📸 اختيار صورة
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      alert("نحتاج إذن الوصول للصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  // ☁️ رفع الصورة على Cloudinary
  const uploadToCloudinary = async (pickedUri: string) => {
    const data = new FormData();

    // 🔹 تحويل URI لـ blob
    const response = await fetch(pickedUri);
    const blob = await response.blob();

    data.append("file", blob);
    data.append("upload_preset", "unsigned_preset");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dz4nwc1yu/image/upload",
      {
        method: "POST",
        body: data,
      }
    );

    const result = await res.json();
    console.log("Cloudinary:", result);

    if (!res.ok) {
      throw new Error(result.error?.message || "Upload failed");
    }

    return result.secure_url;
  };

  // 💾 حفظ التعديلات
  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    try {
      let photoURL = user.photoURL;

      if (photo && photo !== user.photoURL) {
        photoURL = await uploadToCloudinary(photo);
      }

      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL,
      });

      alert("تم حفظ التعديلات بنجاح ✅");
    } catch (err) {
      console.log(err);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  // 🚪 تسجيل الخروج
  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/Register');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>

      {/* الهيدر */}
      <View style={styles.profileHeader}>

        <View style={{ alignItems: 'center' }}>

          <TouchableOpacity onPress={pickImage}>
            <View style={styles.avatar}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>
                  {name ? name.charAt(0).toUpperCase() : "?"}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={pickImage} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>📸 تغيير صورة البروفايل</Text>
          </TouchableOpacity>

        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.profileName}>{name || "لا يوجد اسم"}</Text>
          <Text style={styles.profileRole}>{email || "لا يوجد بريد إلكتروني"}</Text>
        </View>

      </View>

      {/* المنتجات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 منتجاتي</Text>

        {products.length === 0 ? (
          <Text style={{ padding: 12, color: '#888' }}>
            لا توجد منتجات حتى الآن
          </Text>
        ) : (
          products.map(p => (
            <View key={p.id} style={styles.productRow}>
              <Text style={styles.productEmoji}>📦</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={styles.productMeta}>
                  👁 {p.views || 0} مشاهدة
                </Text>
              </View>

              <Text style={styles.productPrice}>
                {p.price} جنيه
              </Text>
            </View>
          ))
        )}
      </View>

      {/* إعدادات الحساب */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="الاسم"
        />

        <TextInput
          style={styles.input}
          value={email}
          editable={false}
        />

        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={loading}>
          <Text style={styles.updateText}>{loading ? "⏳ جاري الحفظ..." : "💾 حفظ التعديلات"}</Text>
        </TouchableOpacity>
      </View>

      {/* تسجيل الخروج */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// 🎨 التصميم
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },

  profileHeader: {
    backgroundColor: '#1a3a2a',
    padding: 24,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center'
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#c8a84b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },

  avatarImg: { width: '100%', height: '100%' },

  avatarText: { color: '#1a3a2a', fontSize: 26, fontWeight: '900' },

  profileName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  profileRole: { color: '#c8a84b', fontSize: 12 },

  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd3c0'
  },

  sectionTitle: {
    padding: 14,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },

  productRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },

  productEmoji: { fontSize: 22, marginRight: 10 },
  productTitle: { fontWeight: '700' },
  productMeta: { fontSize: 11, color: '#888' },
  productPrice: { fontWeight: 'bold', color: '#c8a84b' },

  input: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10
  },

  updateBtn: {
    backgroundColor: '#1a3a2a',
    margin: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },

  updateText: { color: 'white', fontWeight: 'bold' },

  logoutBtn: {
    margin: 16,
    backgroundColor: '#c0392b',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center'
  },

  logoutText: { color: 'white', fontWeight: 'bold' },

  smallBtn: {
    marginTop: 8,
    backgroundColor: '#c8a84b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  smallBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a3a2a'
  }
});