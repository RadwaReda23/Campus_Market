import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const mockProducts = [
  { id: 1, title: 'كتاب حساب التفاضل والتكامل', price: 45, image: '📚', views: 34 },
  { id: 2, title: 'ميكروسكوب محمول', price: 320, image: '🔬', views: 87 },
  { id: 3, title: 'كول روب معمل', price: 30, image: '🥼', views: 19 },
];

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/Register');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>م</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>محمد أحمد السيد</Text>
          <Text style={styles.profileRole}>🎓 طالب — الفرقة الثالثة، الفيزياء</Text>
          <View style={styles.statsRow}>
            {[
              { num: '12', label: 'منتج' },
              { num: '8', label: 'صفقة' },
              { num: '4.8⭐', label: 'تقييم' },
            ].map((s, i) => (
              <View key={i} style={styles.pstat}>
                <Text style={styles.pstatNum}>{s.num}</Text>
                <Text style={styles.pstatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* My Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 منتجاتي</Text>
        {mockProducts.map(p => (
          <View key={p.id} style={styles.productRow}>
            <Text style={styles.productEmoji}>{p.image}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>{p.title}</Text>
              <Text style={styles.productMeta}>👁 {p.views} مشاهدة</Text>
            </View>
            <Text style={styles.productPrice}>{p.price} ج</Text>
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>
        {[
          { label: 'الاسم', value: 'محمد أحمد السيد', icon: '👤' },
          { label: 'البريد', value: 'm.ahmed@sci.cu.edu.eg', icon: '📧' },
          { label: 'الرقم الجامعي', value: '20210234', icon: '🪪' },
          { label: 'القسم', value: 'الفيزياء', icon: '⚛️' },
        ].map((field, i) => (
          <View key={i} style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>{field.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
            <Text style={styles.editBtn}>تعديل</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  profileHeader: { backgroundColor: '#1a3a2a', padding: 24, paddingTop: 50, flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#c8a84b', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#1a3a2a', fontSize: 26, fontWeight: '900' },
  profileName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  profileRole: { color: '#c8a84b', fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  pstat: { alignItems: 'center' },
  pstatNum: { color: 'white', fontSize: 16, fontWeight: '900' },
  pstatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  section: { margin: 16, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd3c0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a3a2a', padding: 14, borderBottomWidth: 1, borderBottomColor: '#ddd3c0' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 10 },
  productEmoji: { fontSize: 24 },
  productTitle: { fontSize: 13, fontWeight: '700', color: '#1a3a2a' },
  productMeta: { fontSize: 11, color: '#8a7d6b', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '900', color: '#c8a84b' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 12 },
  fieldIcon: { fontSize: 18 },
  fieldLabel: { fontSize: 11, color: '#8a7d6b' },
  fieldValue: { fontSize: 13, fontWeight: '600', color: '#1a3a2a' },
  editBtn: { fontSize: 12, color: '#c8a84b', fontWeight: '600' },
  logoutBtn: { margin: 16, backgroundColor: '#c0392b', padding: 14, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});