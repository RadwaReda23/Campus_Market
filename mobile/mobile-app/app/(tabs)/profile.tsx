import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Colors, Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const overrideUserId = params.userId as string;

  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('طالب');
  const [photo, setPhoto] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({ sold: 0, active: 0, rating: 0, count: 0 });
  const [ratingDist, setRatingDist] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOwnProfile = !overrideUserId || overrideUserId === auth.currentUser?.uid;

  useEffect(() => {
    const targetUid = overrideUserId || auth.currentUser?.uid;
    if (!targetUid) { setLoading(false); return; }

    const unsubUser = onSnapshot(doc(db, "users", targetUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setName(data.displayName || '');
        setRole(data.role || 'طالب');
        setPhoto(data.photoURL || '');
        const rate = data.ratingCount > 0 ? (data.ratingSum / data.ratingCount) : 0;
        setStats(prev => ({ ...prev, rating: rate, count: data.ratingCount || 0 }));
        setRatingDist([
            data.ratings?.star5 || Math.floor(data.ratingCount * 0.6) || 0,
            data.ratings?.star4 || Math.floor(data.ratingCount * 0.2) || 0,
            data.ratings?.star3 || Math.floor(data.ratingCount * 0.1) || 0,
            data.ratings?.star2 || Math.floor(data.ratingCount * 0.05) || 0,
            data.ratings?.star1 || Math.floor(data.ratingCount * 0.05) || 0,
        ]);
      }
      setLoading(false);
    });

    const q = query(collection(db, "products"), where("sellerId", "==", targetUid));
    const unsubProds = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
      const active = list.filter((p: any) => p.status === 'active').length;
      setStats(prev => ({ ...prev, active, sold: list.length - active }));
    });

    return () => { unsubUser(); unsubProds(); };
  }, [overrideUserId]);

  const handleUpdate = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { displayName: name, role });
      Alert.alert("✅", "تم التحديث بنجاح");
    } catch { Alert.alert("❌", "فشل التحديث"); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Mirror Web Header Aesthetics */}
      <View style={styles.header}>
        {!isOwnProfile && (
           <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{color:'white', fontSize:20}}>➔</Text>
           </TouchableOpacity>
        )}
        <View style={styles.avatar}>
          {photo ? <Image source={{ uri: photo }} style={styles.avatarImg} /> : <Text style={styles.avatarLetter}>{name[0] || '?'}</Text>}
        </View>
        <Text style={styles.name}>{name || "مستخدم"}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{role}</Text></View>
        
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

      {/* Reputation Chart - Literal Sync */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⭐ التقييمات والسمعة</Text>
        <View style={styles.ratingBox}>
           <View style={styles.ratingSummary}>
              <Text style={styles.ratingLarge}>{stats.rating > 0 ? stats.rating.toFixed(1) : "—"}</Text>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.rateCount}>من {stats.count} تقييم</Text>
           </View>
           <View style={styles.bars}>
              {[5,4,3,2,1].map((s, idx) => {
                  const pct = stats.count > 0 ? (ratingDist[idx] / stats.count) * 100 : 0;
                  return (
                    <View key={s} style={styles.barLine}>
                       <Text style={styles.barLabel}>{s}</Text>
                       <View style={styles.barBg}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                    </View>
                  );
              })}
           </View>
        </View>
      </View>

      {/* Profile Section Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 {isOwnProfile ? 'منتجاتي' : 'المعروض حالياً'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:20}}>
          {products.map(p => (
            <View key={p.id} style={styles.miniCard}>
               <Image source={{ uri: p.imageURL }} style={styles.miniImg} />
               <Text style={styles.miniTitle} numberOfLines={1}>{p.title}</Text>
               <View style={[styles.statusBadge, p.status === 'active' ? styles.bgActive : styles.bgSold]}>
                  <Text style={styles.statusText}>{p.status === 'active' ? 'متاح' : 'مباع'}</Text>
               </View>
            </View>
          ))}
          {products.length === 0 && <Text style={styles.empty}>لا توجد بيانات متاحة</Text>}
        </ScrollView>
      </View>

      {isOwnProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ الإعدادات</Text>
          <Text style={styles.label}>اسم المستخدم</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
             {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
             <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Colors.light.primary, paddingTop: 70, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  backBtn: { position: 'absolute', top: 60, right: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.light.accent, borderWidth: 3, borderColor: 'white', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 35, color: 'white', fontFamily: Fonts.cairoExtraBold },
  name: { fontSize: 22, color: 'white', fontFamily: Fonts.cairoBold, marginTop: 10 },
  roleBadge: { backgroundColor: Colors.light.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 5 },
  roleText: { color: Colors.light.primary, fontSize: 10, fontFamily: Fonts.cairoBold },
  statsRow: { flexDirection: 'row-reverse', marginTop: 25, width: width * 0.8, justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 20 },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 20, color: Colors.light.accent, fontFamily: Fonts.cairoExtraBold },
  statLab: { fontSize: 10, color: 'white', fontFamily: Fonts.cairo, marginTop: 0 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: '100%' },
  section: { margin: 15, padding: 20, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, elevation: 1 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.cairoBold, color: Colors.light.primary, marginBottom: 15, textAlign: 'right' },
  ratingBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
  ratingSummary: { flex: 1, alignItems: 'center' },
  ratingLarge: { fontSize: 44, color: Colors.light.primary, fontFamily: Fonts.cairoExtraBold },
  stars: { color: '#ffc107', fontSize: 14, marginVertical: 4 },
  rateCount: { fontSize: 10, color: Colors.light.muted, fontFamily: Fonts.cairoBold },
  bars: { flex: 2 },
  barLine: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 5, gap: 10 },
  barLabel: { fontSize: 10, color: Colors.light.muted, width: 10, textAlign: 'center' },
  barBg: { flex: 1, height: 6, backgroundColor: Colors.light.background, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#ffc107' },
  miniCard: { width: 110, marginRight: 15, backgroundColor: Colors.light.background, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border },
  miniImg: { width: '100%', height: 80, borderRadius: 8 },
  miniTitle: { fontSize: 10, fontFamily: Fonts.cairoBold, marginTop: 5, textAlign: 'right' },
  statusBadge: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 8, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  bgActive: { backgroundColor: '#d4f4e0' },
  bgSold: { backgroundColor: '#fde8e8' },
  empty: { fontSize: 11, color: Colors.light.muted, textAlign: 'center', width: '100%', fontFamily: Fonts.cairo },
  label: { fontSize: 11, color: Colors.light.muted, textAlign: 'right', marginBottom: 5, fontFamily: Fonts.cairoBold },
  input: { borderBottomWidth: 1, borderBottomColor: Colors.light.border, padding: 8, textAlign: 'right', fontFamily: Fonts.cairo, marginBottom: 20 },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontFamily: Fonts.cairoBold },
  logoutBtn: { backgroundColor: '#fff5f5', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#ffcfcf' },
  logoutText: { color: Colors.light.danger, fontFamily: Fonts.cairoBold, fontSize: 12 }
});