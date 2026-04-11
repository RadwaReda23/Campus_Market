import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  TextInput, Modal, Dimensions, ActivityIndicator, FlatList
} from 'react-native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../app/firebase';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface SearchResult {
  id: string;
  title: string;
  imageURL: string;
  category?: string;
  price?: number | string;
  location?: string;
  type: 'product' | 'library' | 'lost';
}

export default function GlobalSearch({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ products: any[], library: any[], lostFound: any[] }>({
    products: [],
    library: [],
    lostFound: []
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ products: [], library: [], lostFound: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const qText = searchQuery.trim().toLowerCase();
      try {
        const [prodSnap, libSnap, lostSnap] = await Promise.all([
          getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "library"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "lostFound"), orderBy("createdAt", "desc"))),
        ]);

        const match = (val: any) => val && String(val).toLowerCase().includes(qText);

        const products = prodSnap.docs.map(d => ({ id: d.id, ...(d.data() as any), type: 'product' }))
          .filter(p => match(p.title) || match(p.category) || match(p.seller));

        const library = libSnap.docs.map(d => ({ id: d.id, ...(d.data() as any), type: 'library' }))
          .filter(i => match(i.title) || match(i.category));

        const lostFound = lostSnap.docs.map(d => ({ id: d.id, ...(d.data() as any), type: 'lost' }))
          .filter(i => match(i.title) || match(i.description) || match(i.location));

        setResults({ products, library, lostFound });
      } catch (err) {
        console.error("Global Search Error:", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultPress = (item: any) => {
    onClose();
    if (item.type === 'product') router.push('/marketplace');
    else if (item.type === 'library' || item.type === 'lost') router.push('/library');
  };

  const renderSection = (title: string, data: any[], icon: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionIcon}>{icon}</Text>
           <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {data.slice(0, 3).map((item) => (
          <TouchableOpacity key={item.id} style={styles.resultItem} onPress={() => handleResultPress(item)}>
             <Image source={{ uri: item.imageURL }} style={styles.resultImg} />
             <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>
                   {item.type === 'product' ? `${item.price} ج · ${item.category}` : 
                    item.type === 'library' ? 'متاح للاستعارة' : item.location}
                </Text>
             </View>
             <Text style={styles.arrow}>←</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
               <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>
            <View style={styles.searchBar}>
               <TextInput
                 autoFocus
                 placeholder="ابحث عن أي شيء..."
                 style={styles.input}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 placeholderTextColor={Colors.light.muted}
                 textAlign="right"
               />
               <Text style={{fontSize: 18}}>🔍</Text>
            </View>
          </View>

          <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 15}}>
             {loading && <ActivityIndicator color={Colors.light.primary} style={{marginTop: 20}} />}
             {!loading && searchQuery.length >= 2 && results.products.length === 0 && results.library.length === 0 && results.lostFound.length === 0 && (
                <View style={styles.empty}>
                   <Text style={{fontSize: 40}}>🕵️‍♂️</Text>
                   <Text style={styles.emptyText}>مفيش نتائج للكلمة دي</Text>
                </View>
             )}
             
             {renderSection("المنتجات", results.products, "🛒")}
             {renderSection("المكتبة", results.library, "📚")}
             {renderSection("المفقودات", results.lostFound, "🔍")}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26,58,42,0.95)' },
  content: { flex: 1, backgroundColor: 'white', marginTop: 50, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  header: { flexDirection: 'row-reverse', padding: 20, alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 16, color: '#666' },
  searchBar: { flex: 1, flexDirection: 'row-reverse', backgroundColor: '#f9f9f9', borderRadius: 15, paddingHorizontal: 15, height: 50, alignItems: 'center' },
  input: { flex: 1, fontSize: 16, color: Colors.light.primary, fontFamily: 'Amiri-Bold' },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15, gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.light.primary },
  resultItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  resultImg: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#eee' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.light.primary, textAlign: 'right' },
  resultSub: { fontSize: 11, color: Colors.light.muted, textAlign: 'right', marginTop: 2 },
  arrow: { fontSize: 16, color: Colors.light.accent },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: Colors.light.muted, marginTop: 15, fontSize: 15 }
});
