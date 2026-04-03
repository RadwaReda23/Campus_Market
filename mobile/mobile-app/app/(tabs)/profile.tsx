import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/Register');
  };

  const handleUpdate = () => {
    console.log('Updating profile:', { name, email });
    // هنا ممكن تضيف منطق تحديث البيانات فعليًا
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>م</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{name || "my name"}</Text>
          <Text style={styles.profileRole}>{email || "my email"}</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>

        {/* Side by side inputs */}
        <View style={styles.rowInputs}>
          <View style={styles.uiBox}>
            <Text style={styles.label}>My Name</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل اسمك"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.uiBox}>
            <Text style={styles.label}>My Email</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل الإيميل"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Update Button */}
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

  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12
  },

  uiBox: {
    flex: 1,
    marginHorizontal: 5
  },

  label: {
    fontSize: 12,
    color: '#8a7d6b',
    marginBottom: 5
  },

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