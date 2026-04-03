import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const mockLibrary = [
  { id: 1, title: 'بالطو معمل مقاس L', available: true, borrower: null, image: '🥼' },
  { id: 2, title: 'بالطو معمل مقاس M', available: false, borrower: 'علي حسن', image: '🥼' },
  { id: 3, title: 'نظارة واقية', available: true, borrower: null, image: '🥽' },
  { id: 4, title: 'قفازات معمل', available: true, borrower: null, image: '🧤' },
  { id: 5, title: 'بالطو معمل مقاس S', available: false, borrower: 'منى إبراهيم', image: '🥼' },
];

const mockLostFound = [
  { id: 1, title: 'محفظة جلد بنية', description: 'وُجدت بالقرب من قاعة 101', finder: 'طالب مجهول', location: 'مبنى A', date: 'اليوم', image: '👛', claimed: false },
  { id: 2, title: 'كارنيه جامعي', description: 'اسم الطالب غير واضح', finder: 'حارس الأمن', location: 'عند البوابة', date: 'أمس', image: '🪪', claimed: false },
  { id: 3, title: 'مفاتيح خضراء', description: 'مفتاحين على حلقة خضراء', finder: 'دكتورة ريم', location: 'معمل 3', date: 'منذ يومين', image: '🔑', claimed: true },
];

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState('borrow');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 المكتبة</Text>
      </View>

      <View style={styles.alertStrip}>
        <Text style={styles.alertText}>📚 المكتبة للاستعارة المجانية — أعد العناصر بعد الاستخدام</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'borrow' && styles.tabActive]}
          onPress={() => setActiveTab('borrow')}
        >
          <Text style={[styles.tabText, activeTab === 'borrow' && styles.tabTextActive]}>🥼 الاستعارة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.tabActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>🔍 المفقودات</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'borrow' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🥼 عناصر الاستعارة — {mockLibrary.filter(l => l.available).length} متاح
          </Text>
          {mockLibrary.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemEmoji}>{item.image}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={[styles.itemStatus, { color: item.available ? '#27ae60' : '#c0392b' }]}>
                  {item.available ? '✅ متاح للاستعارة' : `❌ مستعار: ${item.borrower}`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.borrowBtn, !item.available && styles.borrowBtnDisabled]}
                disabled={!item.available}
              >
                <Text style={styles.borrowBtnText}>{item.available ? 'استعر' : 'غير متاح'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'lost' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 المفقودات في الكلية</Text>
          {mockLostFound.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemEmoji}>{item.image}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.description}</Text>
                <Text style={styles.itemMeta}>📍 {item.location} · {item.date}</Text>
                {item.claimed && <Text style={styles.claimedBadge}>✅ تم الاسترداد</Text>}
              </View>
              <TouchableOpacity
                style={[styles.borrowBtn, item.claimed && styles.borrowBtnDisabled]}
                disabled={item.claimed}
              >
                <Text style={styles.borrowBtnText}>{item.claimed ? 'مُسترد' : 'ملكي 🙋'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  header: { backgroundColor: '#1a3a2a', padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  alertStrip: { margin: 16, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  alertText: { color: '#1a3a2a', fontSize: 13 },
  tabRow: { flexDirection: 'row', margin: 16, gap: 10 },
  tab: { flex: 1, padding: 10, borderRadius: 20, borderWidth: 2, borderColor: '#ddd3c0', backgroundColor: 'white', alignItems: 'center' },
  tabActive: { backgroundColor: '#1a3a2a', borderColor: '#1a3a2a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8a7d6b' },
  tabTextActive: { color: 'white' },
  section: { margin: 16, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd3c0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a3a2a', padding: 14, borderBottomWidth: 1, borderBottomColor: '#ddd3c0' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe0', gap: 10 },
  itemEmoji: { fontSize: 26 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#1a3a2a' },
  itemStatus: { fontSize: 11, marginTop: 2 },
  itemMeta: { fontSize: 11, color: '#8a7d6b', marginTop: 2 },
  claimedBadge: { fontSize: 11, color: '#27ae60', marginTop: 4 },
  borrowBtn: { backgroundColor: '#1a3a2a', padding: 8, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  borrowBtnDisabled: { backgroundColor: '#ddd3c0' },
  borrowBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
});