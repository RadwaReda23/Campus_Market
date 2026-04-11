import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator, Modal, Dimensions, Alert
} from "react-native";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Colors, Fonts } from '@/constants/theme';
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  productId: string;
  isSystemMessage?: boolean;
}

interface Conversation {
  id: string;
  productId: string;
  productTitle: string;
  productImageURL: string;
  participants: string[];
  participantNames: { [key: string]: string };
  lastMessage?: string;
  lastMessageTime?: any;
  isLibrary?: boolean;
  unreadCount?: { [key: string]: number };
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  
  const scrollViewRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      setConversations(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredConversations = conversations.filter(c => {
    if (activeFilter === "غير مقروءة") {
       const uid = auth.currentUser?.uid;
       return uid ? (c.unreadCount?.[uid] || 0) > 0 : false;
    }
    return true;
  });

  const openChat = async (conv: Conversation) => {
    setSelectedConv(conv);
    setShowChatModal(true);
    const uid = auth.currentUser?.uid;
    if (uid && (conv.unreadCount?.[uid] || 0) > 0) {
       await updateDoc(doc(db, 'conversations', conv.id), { [`unreadCount.${uid}`]: 0 });
    }
  };

  useEffect(() => {
    if (!selectedConv || !showChatModal) return;
    const unsubscribe = onSnapshot(query(collection(db, "conversations", selectedConv.id, "messages"), orderBy("timestamp", "asc")), (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsubscribe;
  }, [selectedConv, showChatModal]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConv || !auth.currentUser) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);
    try {
      const uid = auth.currentUser.uid;
      const otherId = selectedConv.participants.find(id => id !== uid);
      if (!otherId) return;

      await addDoc(collection(db, "conversations", selectedConv.id, "messages"), {
        text, senderId: uid, senderName: auth.currentUser.displayName || auth.currentUser.email, timestamp: serverTimestamp(),
      });

      const currentUnread = selectedConv.unreadCount?.[otherId] || 0;
      await updateDoc(doc(db, 'conversations', selectedConv.id), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherId}`]: currentUnread + 1
      });
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherId = item.participants.find(id => id !== auth.currentUser?.uid);
    const otherName = item.participantNames[otherId!] || "مستخدم";
    const unread = item.unreadCount?.[auth.currentUser?.uid || ''] || 0;
    
    return (
      <TouchableOpacity 
        style={[styles.convItem, unread > 0 && styles.convUnread]} 
        onPress={() => openChat(item)}
      >
        <Image source={{ uri: item.productImageURL }} style={styles.convImg} />
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.convPartner}>{otherName}</Text>
            <Text style={styles.convTime}>
              {item.lastMessageTime?.toDate?.().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) || ''}
            </Text>
          </View>
          <Text style={styles.convProduct} numberOfLines={1}>بخصوص: {item.productTitle}</Text>
          <View style={styles.lastMsgRow}>
             <Text style={[styles.convLastMsg, unread > 0 && styles.textBold]} numberOfLines={1}>{item.lastMessage || 'بدأ المحادثة...'}</Text>
             {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
         <Text style={styles.pageTitle}>💬 المحادثات</Text>
      </View>

      <View style={styles.filterBar}>
         <TouchableOpacity onPress={() => setActiveFilter("الكل")} style={[styles.filterChip, activeFilter === "الكل" && styles.filterActive]}>
            <Text style={[styles.filterLabel, activeFilter === "الكل" && styles.filterLabelActive]}>الكل</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setActiveFilter("غير مقروءة")} style={[styles.filterChip, activeFilter === "غير مقروءة" && styles.filterActive]}>
            <Text style={[styles.filterLabel, activeFilter === "غير مقروءة" && styles.filterLabelActive]}>غير مقروءة</Text>
         </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>لا توجد محادثات حالياً</Text></View>
      ) : (
        <FlatList data={filteredConversations} keyExtractor={item => item.id} renderItem={renderConversationItem} contentContainerStyle={styles.listContent} />
      )}

      {/* Chat Modal */}
      <Modal visible={showChatModal} animationType="slide">
        <View style={styles.chatContainer}>
          <View style={styles.chatTopbar}>
            <TouchableOpacity onPress={() => setShowChatModal(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
            {selectedConv && (
              <TouchableOpacity style={styles.chatHeaderInfo} onPress={() => { setShowChatModal(false); router.push({ pathname:'/profile', params: {userId: selectedConv.participants.find(id => id !== auth.currentUser?.uid)} }); }}>
                <Image source={{ uri: selectedConv.productImageURL }} style={styles.chatImg} />
                <View style={{flex:1}}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{selectedConv.productTitle}</Text>
                  <Text style={styles.chatSub}>{selectedConv.participantNames[selectedConv.participants.find(id => id !== auth.currentUser?.uid)!]}</Text>
                </View>
              </TouchableOpacity>
            )}
            <View style={{width:20}} />
          </View>

          <FlatList
            ref={scrollViewRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const isMe = item.senderId === auth.currentUser?.uid;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                   <Text style={[styles.msgText, {color: isMe ? 'white' : Colors.light.primary}]}>{item.text}</Text>
                   <Text style={[styles.msgTime, {color: isMe ? 'rgba(255,255,255,0.7)' : Colors.light.muted}]}>{item.timestamp?.toDate?.().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) || ''}</Text>
                </View>
              );
            }}
            style={{flex:1}}
            contentContainerStyle={{padding: 15}}
          />

          <View style={styles.inputBar}>
            <TextInput style={styles.input} placeholder="اكتب رسالتك..." value={messageText} onChangeText={setMessageText} multiline />
            <TouchableOpacity style={styles.send} onPress={sendMessage} disabled={sending}>
              <Text style={{fontSize:22}}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  topbar: { backgroundColor: 'white', borderBottomWidth: 2, borderBottomColor: Colors.light.border, paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  filterBar: { flexDirection: 'row-reverse', padding: 15, gap: 10 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.light.border },
  filterActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterLabel: { fontSize: 12, fontFamily: Fonts.cairoBold, color: Colors.light.muted },
  filterLabelActive: { color: 'white' },
  listContent: { padding: 15 },
  convItem: { flexDirection: 'row-reverse', backgroundColor: Colors.light.cardBg, padding: 15, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border, elevation: 2 },
  convUnread: { backgroundColor: '#fffbf0', borderRightWidth: 4, borderRightColor: Colors.light.accent },
  convImg: { width: 55, height: 55, borderRadius: 12 },
  convInfo: { flex: 1, marginRight: 15 },
  convHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  convPartner: { fontSize: 14, fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  convTime: { fontSize: 9, color: Colors.light.muted, fontFamily: Fonts.cairo },
  convProduct: { fontSize: 11, color: Colors.light.accent, fontFamily: Fonts.cairoBold, textAlign: 'right', marginTop: 2 },
  lastMsgRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  convLastMsg: { fontSize: 12, color: Colors.light.muted, fontFamily: Fonts.cairo, textAlign: 'right', flex: 1 },
  textBold: { fontFamily: Fonts.cairoBold, color: Colors.light.primary },
  unreadBadge: { backgroundColor: Colors.light.danger, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: 'white', fontSize: 10, fontFamily: Fonts.cairoBold },
  empty: { fontSize: 13, fontFamily: Fonts.cairo, color: Colors.light.muted },
  chatContainer: { flex: 1, backgroundColor: Colors.light.background },
  chatTopbar: { flexDirection: 'row-reverse', backgroundColor: Colors.light.primary, paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, alignItems: 'center' },
  close: { color: 'white', fontSize: 22 },
  chatHeaderInfo: { flexDirection: 'row-reverse', flex: 1, alignItems: 'center', gap: 12, marginRight: 15 },
  chatImg: { width: 40, height: 40, borderRadius: 10 },
  chatTitle: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 13 },
  chatSub: { color: Colors.light.accent, fontFamily: Fonts.cairo, fontSize: 10 },
  bubble: { padding: 12, borderRadius: 18, marginVertical: 4, maxWidth: '85%' },
  bubbleMe: { alignSelf: 'flex-start', backgroundColor: Colors.light.primary, borderTopLeftRadius: 0 },
  bubbleOther: { alignSelf: 'flex-end', backgroundColor: Colors.light.accent, borderTopRightRadius: 0 },
  msgText: { fontSize: 14, fontFamily: Fonts.cairo, textAlign: 'right' },
  msgTime: { fontSize: 8, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row-reverse', backgroundColor: 'white', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', gap: 12 },
  input: { flex:1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, textAlign: 'right', fontFamily: Fonts.cairo },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' }
});