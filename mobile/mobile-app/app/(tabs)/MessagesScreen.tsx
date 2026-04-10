// MessagesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// ✅ تعريف Type مضبوط
interface ChatItem {
  id: string;
  type: string;
  title?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: number;
}

export default function MessagesScreen({ navigation }: any) {
  const [chats, setChats] = useState<ChatItem[]>([]);

  const fetchChats = async () => {
    try {
      const libSnap = await getDocs(
        query(collection(db, "library"), orderBy("lastMessageTime", "desc"))
      );

      const lostSnap = await getDocs(
        query(collection(db, "lost"), orderBy("lastMessageTime", "desc"))
      );

      const allChats: ChatItem[] = [
        ...libSnap.docs.map(doc => ({
          id: doc.id,
          type: 'library',
          ...(doc.data() as any)
        })),
        ...lostSnap.docs.map(doc => ({
          id: doc.id,
          type: 'lost',
          ...(doc.data() as any)
        }))
      ];

      // ✅ هنا الفلترة بدون error
      setChats(allChats.filter(item => item.lastMessage));
      
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  return (
    <View style={{ flex:1, backgroundColor:'#f5f0e8', padding:10 }}>
      <Text style={{ fontSize:18, fontWeight:'bold', marginBottom:10 }}>
        💬 الرسائل
      </Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('Library', { openChat: true, item })}
          >
            <View style={{ flex:1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.lastMsg}>{item.lastMessage}</Text>
            </View>

            {/* 🔴 عدد الرسائل غير المقروءة */}
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chatItem: {
    flexDirection:'row',
    alignItems:'center',
    padding:12,
    backgroundColor:'white',
    borderRadius:10,
    marginBottom:8
  },
  title: {
    fontWeight:'bold',
    fontSize:14
  },
  lastMsg: {
    color:'#777',
    fontSize:12,
    marginTop:4
  },
  badge: {
    backgroundColor:'#e74c3c',
    borderRadius:20,
    paddingHorizontal:8,
    paddingVertical:4
  },
  badgeText: {
    color:'white',
    fontSize:12
  }
});