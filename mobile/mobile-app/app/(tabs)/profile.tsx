import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { signOut, updateProfile, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

interface LibraryItem {
  id: string;
  title: string;
  imageURL: string;
  available?: boolean;
  borrower?: string | null;
  borrowStart?: string | null;
  borrowEnd?: string | null;
  owner?: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();

  // ✅ حالة بيانات المستخدم
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [lostItems, setLostItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ✅ الاستماع لتغييرات المستخدم
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setName(user.displayName || '');
        setEmail(user.email || '');
        setPhoto(user.photoURL || '');
        fetchMyProducts(user.uid);
        fetchLibraryItems(user.email);
        fetchLostItems(user.email);
      }
    });
    return unsubscribe;
  }, []);

  /* ================= جلب المنتجات ================= */
  // ✅ جلب جميع منتجات المستخدم
  const fetchMyProducts = async (uid: string) => {
    try {
      const q = query(collection(db, "products"), where("sellerId", "==", uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    } catch (err) {
      console.log("خطأ في تحميل المنتجات:", err);
    }
  };

  /* ================= جلب المكتبة ================= */
  // ✅ جلب عناصر المكتبة الخاصة بالمستخدم
  const fetchLibraryItems = async (userEmail: string | null) => {
    if (!userEmail) return;
    try {
      const q = query(collection(db, "library"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[];
      setLibraryItems(list.filter(item => item.owner && item.owner === userEmail));
    } catch (err) {
      console.log("خطأ في تحميل المكتبة:", err);
    }
  };

  /* ================= جلب المفقودات ================= */
  // ✅ جلب الأشياء المفقودة الخاصة بالمستخدم
  const fetchLostItems = async (userEmail: string | null) => {
    if (!userEmail) return;
    try {
      const q = query(collection(db, "lost"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LibraryItem[];
      setLostItems(list.filter(item => item.owner && item.owner === userEmail));
    } catch (err) {
      console.log("خطأ في تحميل المفقودات:", err);
    }
  };

  /* ================= اختيار الصورة ================= */
  // ✅ فتح معرض الصور لاختيار صورة شخصية
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("خطأ", "نحتاج إذن الوصول للصور");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("خطأ في اختيار الصورة:", error);
      Alert.alert("خطأ", "فشل في اختيار الصورة");
    }
  };

  /* ================= تحويل الصورة إلى base64 ================= */
  // ✅ قراءة الصورة وتحويلها إلى base64
  const convertImageToBase64 = async (pickedUri: string): Promise<string> => {
    try {
      const base64String = await FileSystem.readAsStringAsync(pickedUri, {
        encoding: "base64",
      });

      if (!base64String || base64String.length === 0) {
        throw new Error("الملف فارغ");
      }

      const mimeType = "image/jpeg";
      return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
      console.error("خطأ في تحويل الصورة:", error);
      throw new Error("فشل في تحويل الصورة");
    }
  };

  /* ================= حفظ الصورة الشخصية ================= */
  // ✅ حفظ الصورة الشخصية في Firestore و Firebase Auth
  const handleSavePhoto = async () => {
    const user = auth.currentUser;
    if (!user || !photo) return;

    // ✅ إذا كانت الصورة نفس الصورة القديمة، لا تحدّث
    if (photo === user.photoURL) {
      Alert.alert("معلومة", "هذه نفس الصورة السابقة");
      return;
    }

    setUploadingPhoto(true);

    try {
      // ✅ تحويل الصورة إلى base64
      let photoURL = await convertImageToBase64(photo);

      // ✅ تحديث صورة المستخدم في Firebase Auth
      await updateProfile(user, {
        photoURL: photoURL,
      });

      // ✅ تحديث صورة المستخدم في Firestore
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: photoURL,
      });

      Alert.alert("نجاح", "تم تحديث الصورة الشخصية بنجاح ✅");
    } catch (err: any) {
      console.error("خطأ في حفظ الصورة:", err);
      Alert.alert("خطأ", `فشل في حفظ الصورة: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ================= حفظ التعديلات ================= */
  // ✅ حفظ تعديلات الاسم والبيانات الأخرى
  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("خطأ", "الرجاء تسجيل الدخول أولاً");
      return;
    }

    if (!name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال الاسم");
      return;
    }

    setLoading(true);

    try {
      // ✅ تحديث الاسم في Firebase Auth
      await updateProfile(user, {
        displayName: name,
      });

      // ✅ تحديث الاسم في Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
      });

      Alert.alert("نجاح", "تم حفظ التعديلات بنجاح ✅");
    } catch (err: any) {
      console.error("خطأ في التحديث:", err);
      Alert.alert("خطأ", `حدث خطأ أثناء الحفظ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ================= تسجيل الخروج ================= */
  // ✅ تسجيل الخروج من الحساب
  const handleLogout = async () => {
    Alert.alert("تأكيد", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/Register');
          } catch (error) {
            console.error("خطأ في تسجيل الخروج:", error);
            Alert.alert("خطأ", "فشل تسجيل الخروج");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* ✅ رأس الملف الشخصي */}
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

          {/* ✅ زر تغيير الصورة */}
          <TouchableOpacity
            onPress={pickImage}
            style={styles.smallBtn}
            disabled={uploadingPhoto}
          >
            <Text style={styles.smallBtnText}>
              {uploadingPhoto ? "⏳ جاري..." : "📸 تغيير صورة البروفايل"}
            </Text>
          </TouchableOpacity>

          {/* ✅ زر حفظ الصورة */}
          {photo && photo !== auth.currentUser?.photoURL && (
            <TouchableOpacity
              onPress={handleSavePhoto}
              style={[styles.smallBtn, { marginTop: 8, backgroundColor: '#c8a84b' }]}
              disabled={uploadingPhoto}
            >
              <Text style={styles.smallBtnText}>
                {uploadingPhoto ? "⏳ حفظ..." : "💾 حفظ الصورة"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.profileName}>{name || "لا يوجد اسم"}</Text>
          <Text style={styles.profileRole}>{email || "لا يوجد بريد إلكتروني"}</Text>
        </View>
      </View>

      {/* ✅ المنتجات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 منتجاتي ({products.length})</Text>
        {products.length === 0 ? (
          <Text style={{ padding: 12, color: '#888' }}>لا توجد منتجات حتى الآن</Text>
        ) : (
          products.map(p => (
            <View key={p.id} style={styles.productRow}>
              <Text style={styles.productEmoji}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={styles.productMeta}>👁 {p.views || 0} مشاهدة</Text>
              </View>
              <Text style={styles.productPrice}>{p.price} جنيه</Text>
            </View>
          ))
        )}
      </View>

      {/* ✅ مكتبة المستخدم */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 مكتبتي ({libraryItems.length})</Text>
        {libraryItems.length === 0 ? (
          <Text style={{ padding: 12, color: '#888' }}>لا توجد عناصر</Text>
        ) : (
          libraryItems.map(item => (
            <View key={item.id} style={styles.productRow}>
              {item.imageURL && (
                <Image
                  source={{ uri: item.imageURL }}
                  style={{ width: 50, height: 50, borderRadius: 10, marginRight: 10 }}
                />
              )}
              <Text style={styles.productTitle}>{item.title}</Text>
            </View>
          ))
        )}
      </View>

      {/* ✅ المفقودات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 المفقودات ({lostItems.length})</Text>
        {lostItems.length === 0 ? (
          <Text style={{ padding: 12, color: '#888' }}>لا توجد عناصر</Text>
        ) : (
          lostItems.map(item => (
            <View key={item.id} style={styles.productRow}>
              {item.imageURL && (
                <Image
                  source={{ uri: item.imageURL }}
                  style={{ width: 50, height: 50, borderRadius: 10, marginRight: 10 }}
                />
              )}
              <Text style={styles.productTitle}>{item.title}</Text>
            </View>
          ))
        )}
      </View>

      {/* ✅ إعدادات الحساب */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>

        {/* ✅ حقل الاسم */}
        <View style={{ padding: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6, color: '#1a3a2a' }}>الاسم</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="أدخل اسمك"
            placeholderTextColor="#999"
          />
        </View>

        {/* ✅ حقل البريد الإلكتروني (غير قابل للتعديل) */}
        <View style={{ padding: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6, color: '#1a3a2a' }}>البريد الإلكتروني</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#f0f0f0' }]}
            value={email}
            editable={false}
            placeholderTextColor="#999"
          />
        </View>

        {/* ✅ زر حفظ التعديلات */}
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={styles.updateText}>
            {loading ? "⏳ جاري الحفظ..." : "💾 حفظ التعديلات"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ تسجيل الخروج */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= الأنماط ================= */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f0e8' 
  },

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
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff'
  },

  avatarImg: { 
    width: '100%', 
    height: '100%' 
  },

  avatarText: { 
    color: '#1a3a2a', 
    fontSize: 26, 
    fontWeight: '900' 
  },

  profileName: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  profileRole: { 
    color: '#c8a84b', 
    fontSize: 12 
  },

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
    borderBottomColor: '#eee',
    color: '#1a3a2a',
    fontSize: 14
  },

  productRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },

  productEmoji: { 
    fontSize: 22, 
    marginRight: 10 
  },

  productTitle: { 
    fontWeight: '700',
    color: '#333'
  },

  productMeta: { 
    fontSize: 11, 
    color: '#888' 
  },

  productPrice: { 
    fontWeight: 'bold', 
    color: '#c8a84b' 
  },

  input: { 
    padding: 10, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10,
    fontSize: 14,
    color: '#333'
  },

  updateBtn: { 
    backgroundColor: '#1a3a2a', 
    margin: 12, 
    marginTop: 16,
    padding: 12, 
    borderRadius: 10, 
    alignItems: 'center' 
  },

  updateText: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 14
  },

  logoutBtn: { 
    margin: 16, 
    marginTop: 24,
    backgroundColor: '#c0392b', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },

  logoutText: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 14
  },

  smallBtn: { 
    marginTop: 8, 
    backgroundColor: '#c8a84b', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20 
  },

  smallBtnText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#1a3a2a' 
  }
});