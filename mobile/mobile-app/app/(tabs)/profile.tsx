import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  signOut, updateProfile, onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  collection, query, where,
  doc, updateDoc, onSnapshot
} from 'firebase/firestore';
import { Colors, Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();

  const [userData, setUserData]             = useState<any>(null);
  const [targetUid, setTargetUid]           = useState<string | null>(null);
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [role, setRole]                     = useState('طالب');
  const [photo, setPhoto]                   = useState<string | null>(null);
  const [products, setProducts]             = useState<any[]>([]);
  const [libraryItems, setLibraryItems]     = useState<any[]>([]);
  const [lostItems, setLostItems]           = useState<any[]>([]);
  const [stats, setStats]                   = useState({ sold: 0, active: 0 });
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isOwnProfile = true;

  // ─── Auth + Firestore listeners ────────────────────────────────────────────
  useEffect(() => {
    let unsubUser: (() => void) | null  = null;
    let unsubProds: (() => void) | null = null;

    const bootstrap = async () => {
      let uidToFetch = auth.currentUser?.uid;

      if (!uidToFetch && auth.currentUser) {
        try { await auth.currentUser.reload(); } catch (e) { console.log(e); }
        uidToFetch = auth.currentUser?.uid;
      }

      if (!uidToFetch) { setLoading(false); return; }

      setTargetUid(uidToFetch);

      unsubUser = onSnapshot(doc(db, "users", uidToFetch), (snap) => {
        let displayName = '';
        let photoURL: string | null = null;

        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          displayName = data.displayName || data.name || '';
          photoURL    = data.photoURL    || null;
          setRole(data.role || 'طالب');
        }
        
        setEmail(auth.currentUser?.email || '');

        if (!displayName && auth.currentUser) {
          displayName = auth.currentUser.displayName || '';
          photoURL    = photoURL || auth.currentUser.photoURL || null;
        }

        setName(displayName);
        setPhoto(photoURL);
        setLoading(false);
      });

      const q = query(collection(db, "products"), where("sellerId", "==", uidToFetch));
      unsubProds = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(list);
        const active = list.filter((p: any) => p.status === 'active').length;
        setStats({ active, sold: list.length - active });
      });
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) bootstrap();
      else setLoading(false);
    });
    return () => { unsubAuth(); unsubUser?.(); unsubProds?.(); };
  }, []);

  useEffect(() => {
    let unsubLib: (() => void) | null = null;
    let unsubLost: (() => void) | null = null;

    const targetEmail = auth.currentUser?.email || email;

    if (targetEmail) {
      const qLib = query(collection(db, "library"), where("owner", "==", targetEmail));
      unsubLib = onSnapshot(qLib, (snap) => {
        setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      const qLost = query(collection(db, "lost"), where("owner", "==", targetEmail));
      unsubLost = onSnapshot(qLost, (snap) => {
        setLostItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    return () => { unsubLib?.(); unsubLost?.(); };
  }, [email]);

  // ─── Pick image ────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("خطأ", "نحتاج إذن الوصول للصور"); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhoto(uri);
      await handlePhotoUpload(uri);
    }
  };

  // ─── Upload to Cloudinary ──────────────────────────────────────────────────
  const uploadToCloudinary = async (pickedUri: string): Promise<string> => {
<<<<<<< Updated upstream
    const response = await fetch(pickedUri);
    const blob = await response.blob();
    const data = new FormData();
    data.append("file", blob);
    data.append("upload_preset", "unsigned_preset");

    const res = await fetch("https://api.cloudinary.com/v1_1/dz4nwc1yu/image/upload", {
=======
    const data = new FormData();
    data.append("file", {
      uri: pickedUri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);
    data.append("upload_preset", "nlkvsjlj");

    const res = await fetch("https://api.cloudinary.com/v1_1/dgowyewii/image/upload", {
>>>>>>> Stashed changes
      method: "POST", body: data,
    });
    const result = await res.json();
    if (!result.secure_url) throw new Error(result.error?.message || "Upload failed");
    return result.secure_url;
  };

  // ─── Upload photo ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (localUri: string) => {
    if (!auth.currentUser) return;
    setUploadingPhoto(true);
    try {
      const photoURL = await uploadToCloudinary(localUri);
      await updateProfile(auth.currentUser, { photoURL });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL });
      setPhoto(photoURL);
      Alert.alert("✅", "تم تحديث الصورة بنجاح");
    } catch (err) {
      console.error(err);
      Alert.alert("❌", "فشل رفع الصورة");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ─── Save name / role ──────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { displayName: name, role });
      Alert.alert("✅", "تم التحديث بنجاح");
    } catch {
      Alert.alert("❌", "فشل التحديث");
    } finally {
      setSaving(false);
    }
  };

  // ─── ✅ Logout — فوري بدون confirmation ────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/Register');
    } catch (err) {
      Alert.alert("❌", "فشل تسجيل الخروج");
    }
  };

  const userRatings = userData?.ratings || {};
  const ratingKeys = Object.keys(userRatings);

  let totalScore = 0;
  for (const key of ratingKeys) {
    totalScore += Number(userRatings[key] || 0);
  }
  const averageRating = ratingKeys.length > 0
    ? (totalScore / ratingKeys.length).toFixed(1)
    : 0;

  const myVote = auth.currentUser ? userRatings[auth.currentUser.uid] : null;

  const handleRate = async (score: number) => {
    if (!auth.currentUser || !targetUid) {
      Alert.alert("خطأ", "يجب تسجيل الدخول للتقييم");
      return;
    }
    try {
      const newRatings = { ...userRatings, [auth.currentUser.uid]: score };
      await updateDoc(doc(db, "users", targetUid), { ratings: newRatings });
      Alert.alert("✅", "تم تسجيل التقييم بنجاح!");
    } catch (e) {
      Alert.alert("❌", "حدث خطأ أثناء التقييم");
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* ══ Header ══ */}
      <View style={styles.header}>

        {!isOwnProfile && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: 'white', fontSize: 20 }}>➔</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={isOwnProfile ? pickImage : undefined}
          activeOpacity={isOwnProfile ? 0.7 : 1}
        >
          <View style={styles.avatar}>
            {uploadingPhoto && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="white" />
              </View>
            )}
            {photo
              ? <Image source={{ uri: photo }} style={styles.avatarImg} />
              : <Text style={styles.avatarLetter}>{name[0]?.toUpperCase() || '?'}</Text>
            }
          </View>
        </TouchableOpacity>

        {isOwnProfile && (
          <TouchableOpacity onPress={pickImage} style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>📸 تغيير صورة البروفايل</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.name}>{name || "مستخدم"}</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>

        {targetUid && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingScore}>{averageRating} / 5</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => {
                const displayValue = myVote ? myVote : Math.round(Number(averageRating));
                const isSelected = star <= displayValue;
                return (
                  <TouchableOpacity
                    key={star}
                    disabled={isOwnProfile}
                    onPress={() => handleRate(star)}
                  >
                    <Text style={[styles.star, isSelected ? styles.starFilled : styles.starEmpty]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.ratingCount}>({ratingKeys.length} تقييم)</Text>
            {!isOwnProfile && (
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontFamily: Fonts.cairoBold }}>
                {myVote ? `تقييمك المُسجل: ${myVote} ⭐️` : 'اضغط النجوم للتصويت'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.active}</Text>
            <Text style={styles.statLab}>منتج معروض</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.sold}</Text>
            <Text style={styles.statLab}>صفقة مكتملة</Text>
          </View>
        </View>

      </View>

      {/* ══ المنتجات ══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📦 {isOwnProfile ? 'منتجاتي' : 'المعروض حالياً'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {products.map(p => (
            <View key={p.id} style={styles.miniCard}>
              <Image source={{ uri: p.imageURL }} style={styles.miniImg} />
              <Text style={styles.miniTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.miniPrice}>{p.price} جنيه</Text>
              <View style={[styles.statusBadge, p.status === 'active' ? styles.bgActive : styles.bgSold]}>
                <Text style={styles.statusText}>{p.status === 'active' ? 'متاح' : 'مباع'}</Text>
              </View>
            </View>
          ))}
          {products.length === 0 && (
            <Text style={styles.empty}>لا توجد منتجات حتى الآن</Text>
          )}
        </ScrollView>
      </View>

      {/* ══ منتجات المكتبة (استعارة ومفقودات) ══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📚 {isOwnProfile ? 'مرفوعاتي في المكتبة (استعارة ومفقودات)' : 'مرفوعات المكتبة'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {libraryItems.map(p => (
            <View key={p.id} style={styles.miniCard}>
              <Image source={{ uri: p.imageURL }} style={styles.miniImg} />
              <Text style={styles.miniTitle} numberOfLines={1}>{p.title}</Text>
              <View style={[styles.statusBadge, p.available ? styles.bgActive : styles.bgSold]}>
                <Text style={styles.statusText}>{p.available ? 'استعارة: متاح' : 'استعارة: مستعار'}</Text>
              </View>
            </View>
          ))}
          {lostItems.map(p => (
            <View key={p.id} style={styles.miniCard}>
              <Image source={{ uri: p.imageURL }} style={styles.miniImg} />
              <Text style={styles.miniTitle} numberOfLines={1}>{p.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: '#fdf2d0' }]}>
                <Text style={[styles.statusText, { color: '#c49000' }]}>مفقود</Text>
              </View>
            </View>
          ))}
          {libraryItems.length === 0 && lostItems.length === 0 && (
            <Text style={styles.empty}>لا توجد عناصر مرفوعة في المكتبة</Text>
          )}
        </ScrollView>
      </View>

      {/* ══ الإعدادات ══ */}
      {isOwnProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>

          <Text style={styles.label}>اسم المستخدم</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="الاسم"
            textAlign="right"
          />

          <Text style={styles.label}>البريد الإلكتروني</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            textAlign="right"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={styles.saveBtnText}>💾 حفظ التغييرات</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 70, paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  backBtn: { position: 'absolute', top: 60, right: 20 },

  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.light.accent,
    borderWidth: 3, borderColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 35, color: 'white', fontFamily: Fonts.cairoExtraBold },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },

  changePhotoBtn: {
    marginTop: 8, backgroundColor: Colors.light.accent,
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
  },
  changePhotoText: { fontSize: 11, fontFamily: Fonts.cairoBold, color: Colors.light.primary },

  name: { fontSize: 22, color: 'white', fontFamily: Fonts.cairoBold, marginTop: 10 },
  emailText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.cairo, marginTop: 2 },

  roleBadge: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, marginTop: 5,
  },
  roleText: { color: Colors.light.primary, fontSize: 10, fontFamily: Fonts.cairoBold },

  ratingContainer: { alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  starsRow: { flexDirection: 'row-reverse', marginVertical: 4, gap: 5 },
  star: { fontSize: 24 },
  starFilled: { color: Colors.light.accent },
  starEmpty: { color: 'rgba(255,255,255,0.3)' },
  ratingScore: { fontSize: 13, color: 'white', fontFamily: Fonts.cairoBold },
  ratingCount: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.cairo },

  statsRow: {
    flexDirection: 'row-reverse', marginTop: 25,
    width: width * 0.8, justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15, borderRadius: 20,
  },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 20, color: Colors.light.accent, fontFamily: Fonts.cairoExtraBold },
  statLab: { fontSize: 10, color: 'white', fontFamily: Fonts.cairo },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: '100%' },

  section: {
    margin: 15, padding: 20, backgroundColor: 'white',
    borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, elevation: 1,
  },
  sectionTitle: {
    fontSize: 14, fontFamily: Fonts.cairoBold,
    color: Colors.light.primary, marginBottom: 15, textAlign: 'right',
  },

  miniCard: {
    width: 110, marginRight: 15,
    backgroundColor: Colors.light.background,
    padding: 8, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  miniImg: { width: '100%', height: 80, borderRadius: 8 },
  miniTitle: { fontSize: 10, fontFamily: Fonts.cairoBold, marginTop: 5, textAlign: 'right' },
  miniPrice: { fontSize: 10, color: Colors.light.accent, fontFamily: Fonts.cairoBold, textAlign: 'right' },
  statusBadge: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 8, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  bgActive: { backgroundColor: '#d4f4e0' },
  bgSold: { backgroundColor: '#fde8e8' },
  empty: { fontSize: 11, color: Colors.light.muted, textAlign: 'center', width: '100%', fontFamily: Fonts.cairo },

  label: { fontSize: 11, color: Colors.light.muted, textAlign: 'right', marginBottom: 5, fontFamily: Fonts.cairoBold },
  input: { borderBottomWidth: 1, borderBottomColor: Colors.light.border, padding: 8, fontFamily: Fonts.cairo, marginBottom: 20 },
  inputDisabled: { color: '#aaa' },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontFamily: Fonts.cairoBold },
  logoutBtn: {
    backgroundColor: '#fff5f5', padding: 12, borderRadius: 12,
    alignItems: 'center', marginTop: 15,
    borderWidth: 1, borderColor: '#ffcfcf',
  },
  logoutText: { color: Colors.light.danger, fontFamily: Fonts.cairoBold, fontSize: 12 },
});
