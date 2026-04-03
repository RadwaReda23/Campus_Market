import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, updateProfile, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const mockProducts = [
  { id: 1, title: 'كتاب حساب التفاضل والتكامل', price: 45, image: '📚', views: 34 },
  { id: 2, title: 'ميكروسكوب محمول', price: 320, image: '🔬', views: 87 },
  { id: 3, title: 'كول روب معمل', price: 30, image: '🥼', views: 19 },
];

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setName(user.displayName || '');
        setEmail(user.email || '');
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/Register');
  };

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        displayName: name,
      });
      alert("Profile updated ✅");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      
      {/* Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name ? name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{name || "No Name"}</Text>
          <Text style={styles.profileRole}>{email || ""}</Text>
        </View>
      </View>

      {/* Products */}
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

        <View style={styles.uiBox}>
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل اسمك"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.uiBox}>
          <Text style={styles.label}>الإيميل</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل الإيميل"
            value={email}
            editable={false}
          />
        </View>

        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
          <Text style={styles.updateText}>Update Profile</Text>
        </TouchableOpacity>
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

  profileHeader: {
    backgroundColor: '#1a3a2a',
    padding: 24,
    paddingTop: 50,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center'
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c8a84b',
    justifyContent: 'center',
    alignItems: 'center'
  },

  avatarText: { color: '#1a3a2a', fontSize: 26, fontWeight: '900' },
  profileName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  profileRole: { color: '#c8a84b', fontSize: 12 },

  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd3c0',
    overflow: 'hidden'
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a3a2a',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd3c0'
  },

  productRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe0'
  },

  productEmoji: { fontSize: 24 },
  productTitle: { fontSize: 13, fontWeight: '700' },
  productMeta: { fontSize: 11, color: '#8a7d6b' },
  productPrice: { fontWeight: 'bold', color: '#c8a84b' },

  uiBox: { padding: 12 },
  label: { fontSize: 12, color: '#8a7d6b', marginBottom: 5 },

  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fafafa'
  },

  updateBtn: {
    backgroundColor: '#1a3a2a',
    padding: 12,
    margin: 12,
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

  logoutText: { color: 'white', fontWeight: 'bold' }
});