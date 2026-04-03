import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const COLORS = {
  primary: '#1a3a2a',
  accent: '#c8a84b',
  light: '#f5f0e8',
  muted: '#8a7d6b',
  border: '#ddd3c0',
  cardBg: '#fffdf8',
  success: '#27ae60',
  danger: '#c0392b',
};

const mockProducts = [
  { id: 1, title: 'كتاب حساب التفاضل والتكامل', price: 45, seller: 'أحمد محمد', image: '📚', views: 34, time: 'منذ ساعتين' },
  { id: 2, title: 'ميكروسكوب محمول', price: 320, seller: 'د. سارة علي', image: '🔬', views: 87, time: 'منذ يوم' },
  { id: 3, title: 'كول روب معمل', price: 30, seller: 'فاطمة حسن', image: '🥼', views: 19, time: 'منذ 3 أيام' },
  { id: 4, title: 'آلة حاسبة علمية', price: 150, seller: 'محمود إبراهيم', image: '🔢', views: 52, time: 'منذ 5 أيام' },
];

const mockLostFound = [
  { id: 1, title: 'محفظة جلد بنية', description: 'وُجدت بالقرب من قاعة 101', location: 'مبنى A', date: 'اليوم', image: '👛' },
  { id: 2, title: 'كارنيه جامعي', description: 'اسم الطالب غير واضح', location: 'عند البوابة', date: 'أمس', image: '🪪' },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/Register');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔬 سوق كلية العلوم</Text>
          <Text style={styles.headerSub}>جامعة القاهرة</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>خروج 🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
        {[
          { label: 'منتج نشط', value: '142', icon: '🛒' },
          { label: 'صفقة مكتملة', value: '89', icon: '✅' },
          { label: 'مستخدم', value: '1.2k', icon: '👥' },
          { label: 'في المكتبة', value: '38', icon: '📚' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Alert */}
      <View style={styles.alertStrip}>
        <Text style={styles.alertText}>📢 تم إضافة 5 منتجات جديدة اليوم!</Text>
      </View>

      {/* Recent Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 أحدث المنتجات</Text>
        {mockProducts.map(p => (
          <View key={p.id} style={styles.productRow}>
            <Text style={styles.productEmoji}>{p.image}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{p.title}</Text>
              <Text style={styles.productMeta}>{p.seller} · {p.time}</Text>
            </View>
            <View>
              <Text style={styles.productPrice}>{p.price} ج</Text>
              <Text style={styles.productViews}>👁 {p.views}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Lost & Found */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 المفقودات الأخيرة</Text>
        {mockLostFound.map(item => (
          <View key={item.id} style={styles.lostRow}>
            <Text style={styles.lostEmoji}>{item.image}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{item.title}</Text>
              <Text style={styles.productMeta}>{item.description}</Text>
              <Text style={styles.productMeta}>📍 {item.location} · {item.date}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#c8a84b', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: '#c0392b', padding: 8, borderRadius: 8 },
  logoutText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  statsRow: { padding: 16, paddingBottom: 0 },
  statCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginLeft: 10, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: '#ddd3c0' },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#1a3a2a', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#8a7d6b', marginTop: 2, textAlign: 'center' },
  alertStrip: { margin: 16, backgroundColor: '#fffbf0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#c8a84b44' },
  alertText: { color: '#1a3a2a', fontSize: 13 },
  section: { margin: 16, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd3c0' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a3a2a', padding: 14, borderBottomWidth: 1, borderBottomColor: '#ddd3c0' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 10 },
  productEmoji: { fontSize: 28 },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 13, fontWeight: '700', color: '#1a3a2a' },
  productMeta: { fontSize: 11, color: '#8a7d6b', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '900', color: '#c8a84b', textAlign: 'right' },
  productViews: { fontSize: 10, color: '#8a7d6b', textAlign: 'right' },
  lostRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 10 },
  lostEmoji: { fontSize: 32 },
});