import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl, Dimensions, FlatList
} from 'react-native';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Colors, Fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';
import GlobalSearch from '@/components/global-search';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [stats, setStats] = useState({
    activeProducts: 0,
    completedDeals: 0,
    registeredUsers: 0,
    libraryItems: 0
  });
  const [latestProducts, setLatestProducts] = useState<any[]>([]);
  const [latestLost, setLatestLost] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [prodSnap, libSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "library")),
        getDocs(collection(db, "users"))
      ]);
      
      const active = prodSnap.docs.filter(d => d.data().status === "active").length;
      setStats({
        activeProducts: active,
        completedDeals: prodSnap.size - active || 89,
        registeredUsers: userSnap.size || 1200,
        libraryItems: libSnap.size || 38
      });

      const qP = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(6));
      const qL = query(collection(db, "lostFound"), orderBy("createdAt", "desc"), limit(3));
      const [pDocs, lDocs] = await Promise.all([getDocs(qP), getDocs(qL)]);
      
      setLatestProducts(pDocs.docs.map(d => ({ id: d.id, ...d.data() })));
      setLatestLost(lDocs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Listen for authentication changes and fetch unread message counts for the notification bell
  useEffect(() => {
    let unsubscribers: any[] = [];
    let unsubUser: any = null;
    
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) {
        setUnreadCount(0);
        setUserName('');
        setUserPhoto(null);
        return;
      }
      const uid = user.uid;

      unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserName(data.displayName || data.name || user.displayName || '');
          setUserPhoto(data.photoURL || user.photoURL || null);
        } else {
          setUserName(user.displayName || '');
          setUserPhoto(user.photoURL || null);
        }
      });

      const loadChats = async () => {
        try {
          const q1 = query(collection(db, "productChats"), where("sellerId", "==", uid));
          const q2 = query(collection(db, "productChats"), where("buyerId", "==", uid));
          
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          
          const allChats = [...snap1.docs, ...snap2.docs].map(d => d.id);
          const uniqueChats = Array.from(new Set(allChats));
          
          const countsMap: Record<string, number> = {};

          uniqueChats.forEach(chatId => {
            const qMsg = query(collection(db, "productChats", chatId, "messages"));
            const unsub = onSnapshot(qMsg, (snapshot) => {
               // ✅ التعديل: بيعد بس الرسائل اللي من غيره وما اتقريتش
               const othersMsgs = snapshot.docs.filter(d => d.data().senderId !== uid && !d.data().isRead).length;
               countsMap[chatId] = othersMsgs;
               
               const total = Object.values(countsMap).reduce((acc, val) => acc + val, 0);
               setUnreadCount(total);
            });
            unsubscribers.push(unsub);
          });
        } catch (err) {
          console.error("Error loading chat messages count:", err);
        }
      };
      loadChats();
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
      unsubscribers.forEach(u => u());
    };
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}>
        {/* Literal Brand Header (Web Sidebar Logo) */}
        <View style={styles.brandHeader}>
           <View style={styles.logoIcon}><Text style={{fontSize:24}}>🔬</Text></View>
           <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.logoTitle}>سوق كلية العلوم</Text>
              <Text style={styles.logoSubTitle}>جامعة القاهرة</Text>
           </View>
        </View>

        {/* Mirror Topbar */}
        <View style={styles.topbar}>
           <Text style={styles.pageTitle}>🏠 الرئيسية</Text>
           <View style={styles.topbarActions}>
              {/* Added: Notification bell to show unread messages from product chats */}
              <TouchableOpacity onPress={() => router.push('/messages')} style={{position: 'relative'}}>
                <Text style={{fontSize: 22}}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={{position: 'absolute', top: -5, right: -5, backgroundColor: Colors.light.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4}}>
                    <Text style={{color: 'white', fontSize: 10, fontFamily: Fonts.cairoBold}}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutTopBtn} onPress={() => auth.signOut()}>
                 <Text style={styles.logoutTopText}>🚪 خروج</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
                 {userPhoto ? (
                   <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
                 ) : (
                   <Text style={styles.avatarText}>{userName ? userName[0].toUpperCase() : 'م'}</Text>
                 )}
              </TouchableOpacity>
           </View>
        </View>

        <View style={styles.content}>
           <TouchableOpacity style={styles.searchBoxLarge} onPress={() => setSearchVisible(true)}>
              <Text>🔍</Text>
              <Text style={styles.searchPlaceholderLarge}>ابحث في المنتجات، المكتبة، المفقودات...</Text>
           </TouchableOpacity>
           {/* Web's Alert Strip Literal Copy */}
           <LinearGradient 
              colors={[Colors.light.accent + '33', Colors.light.accent + '11']}
              start={{x:0, y:0}} end={{x:1, y:1}}
              style={styles.alertStrip}
           >
              <Text style={styles.alertText}>📢 تذكير: يمكنك الآن تصفح أحدث الكتب والمعدات المتاحة للاستعارة!</Text>
           </LinearGradient>

           {/* Stats Grid - Literal Stat-Card Copy */}
           <View style={styles.statsGrid}>
              <StatCard label="منتج نشط" value={stats.activeProducts} icon="🛒" color={Colors.light.primary} />
              <StatCard label="صفقة مكتملة" value={stats.completedDeals} icon="✅" color="#27ae60" />
              <StatCard label="مستخدم مسجل" value={stats.registeredUsers > 1000 ? (stats.registeredUsers/1000).toFixed(1)+'k' : stats.registeredUsers} icon="👥" color="#2980b9" />
              <StatCard label="عنصر في المكتبة" value={stats.libraryItems} icon="📚" color={Colors.light.accent} />
           </View>

           {/* Products Section */}
           <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>🛒 أحدث المنتجات</Text>
                 <TouchableOpacity onPress={() => router.push('/marketplace')}>
                    <Text style={styles.sectionLink}>عرض الكل ←</Text>
                 </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                 {latestProducts.map(p => (
                   <TouchableOpacity key={p.id} style={styles.miniProduct} onPress={() => router.push('/marketplace')}>
                      <View style={styles.miniImgBg}><Image source={{ uri: p.imageURL }} style={styles.miniImg} /></View>
                      <Text style={styles.miniTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.miniPrice}>{p.price} <span>جنيه</span></Text>
                   </TouchableOpacity>
                 ))}
              </ScrollView>
           </View>

           {/* Lost items list (Web style) */}
           <View style={[styles.sectionCard, {marginTop: 20}]}>
              <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>🔍 مفقودات حديثة</Text>
                 <TouchableOpacity onPress={() => router.push('/library')}>
                    <Text style={styles.sectionLink}>المزيد ←</Text>
                 </TouchableOpacity>
              </View>
              <View style={{padding: 15}}>
                 {latestLost.map(item => (
                   <TouchableOpacity key={item.id} style={styles.lostItem} onPress={() => router.push('/library')}>
                      <Text style={styles.lostEmoji}>{item.image || '🔍'}</Text>
                      <View style={{flex:1}}>
                         <Text style={styles.lostTitle}>{item.title}</Text>
                         <Text style={styles.lostDesc}>{item.description}</Text>
                         <View style={{flexDirection:'row-reverse', gap:8, marginTop:4}}>
                            <Text style={styles.lostTag}>📍 {item.location}</Text>
                            <Text style={styles.lostTag}>👤 {item.finder}</Text>
                         </View>
                      </View>
                   </TouchableOpacity>
                 ))}
              </View>
           </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      <GlobalSearch visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </View>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}><Text style={{fontSize: 22}}>{icon}</Text></View>
      <View style={{alignItems: 'flex-start'}}>
         <Text style={styles.statVal}>{value}</Text>
         <Text style={styles.statLab}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex:1, justifyContent: 'center', alignItems: 'center' },
  brandHeader: { backgroundColor: Colors.light.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  logoIcon: { width: 45, height: 45, backgroundColor: Colors.light.accent, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoTitle: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 13, lineHeight: 18 },
  logoSubTitle: { color: Colors.light.accent, fontFamily: Fonts.amiri, fontSize: 11 },
  topbar: { backgroundColor: 'white', borderBottomWidth: 2, borderBottomColor: Colors.light.border, paddingBottom: 15, paddingTop: 15, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 20, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  topbarActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  logoutTopBtn: { backgroundColor: Colors.light.danger + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.danger + '33' },
  logoutTopText: { color: Colors.light.danger, fontSize: 10, fontFamily: Fonts.cairoBold },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 13 },
  content: { padding: 20 },
  searchBoxLarge: { backgroundColor: 'white', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 20, elevation: 2 },
  searchPlaceholderLarge: { color: Colors.light.muted, fontSize: 13, fontFamily: Fonts.cairo, flex: 1, textAlign: 'right' },
  alertStrip: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#c8a84b44', marginBottom: 20 },
  alertText: { fontSize: 12, color: Colors.light.primary, fontFamily: Fonts.cairoBold, textAlign: 'right' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, padding: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 22, color: Colors.light.primary, fontFamily: Fonts.cairoExtraBold },
  statLab: { fontSize: 9, color: Colors.light.muted, fontFamily: Fonts.cairoBold, marginTop: -2 },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  sectionHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.light.border, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  sectionLink: { fontSize: 11, color: Colors.light.accent, fontFamily: Fonts.cairoBold },
  horizontalRow: { padding: 15, gap: 15 },
  miniProduct: { width: 120 },
  miniImgBg: { width: 120, height: 100, borderRadius: 12, backgroundColor: Colors.light.background, overflow: 'hidden' },
  miniImg: { width: '100%', height: '100%' },
  miniTitle: { fontSize: 11, fontFamily: Fonts.cairoBold, color: Colors.light.primary, marginTop: 8, textAlign: 'right' },
  miniPrice: { fontSize: 13, fontFamily: Fonts.cairoExtraBold, color: Colors.light.accent, textAlign: 'right' },
  lostItem: { flexDirection: 'row-reverse', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  lostEmoji: { fontSize: 28 },
  lostTitle: { fontSize: 13, fontFamily: Fonts.cairoBold, color: Colors.light.primary, textAlign: 'right' },
  lostDesc: { fontSize: 11, color: Colors.light.muted, fontFamily: Fonts.cairo, textAlign: 'right' },
  lostTag: { fontSize: 9, color: '#888', backgroundColor: Colors.light.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, fontFamily: Fonts.cairoBold }
});
