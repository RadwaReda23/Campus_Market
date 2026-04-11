import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, FlatList, Modal, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ☁️ Cloudinary Config
const CLOUDINARY_CLOUD_NAME = "dz4nwc1yu";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  imageURL: string;
  seller: string;
  sellerId: string;
  createdAt?: any;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  productId: string;
}

interface Conversation {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  messages: Message[];
  unreadCount: number;
  lastMessage?: string;
}

export default function ProductsScreen() {
  const [form, setForm] = useState({ title: '', price: '', category: 'كتب' });
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // ✅ حالة الشات
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchProducts();
    if (auth.currentUser) {
      listenToConversations();
    }
  }, []);

  // ✅ الاستماع للرسائل الجديدة عند فتح المحادثة
  useEffect(() => {
    if (!showChatModal || !selectedProduct || !auth.currentUser) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'messages'),
        where('productId', '==', selectedProduct.id),
        orderBy('timestamp', 'asc')
      ),
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setChatMessages(messages);
        
        // ✅ Scroll to bottom عند وصول رسالة جديدة
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error('❌ خطأ في الاستماع للرسائل:', error);
      }
    );

    return unsubscribe;
  }, [showChatModal, selectedProduct]);

  /* ================= جمع المنتجات ================= */
  // 📦 جلب المنتجات
  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      setProducts(list);
    } catch (err: any) {
      console.log("❌ خطأ في تحميل المنتجات:", err);
      Alert.alert("خطأ", "فشل تحميل المنتجات");
    }
  };

  /* ================= نظام الشات ================= */
  // ✅ الاستماع للمحادثات
  const listenToConversations = () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const convList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Conversation[];

        setConversations(convList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ خطأ في الاستماع للمحادثات:', error);
    }
  };

  // ✅ فتح المحادثة
  const openChat = async (product: Product) => {
    if (!auth.currentUser) {
      Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً');
      return;
    }

    // ✅ منع المستخدم من الشات مع نفسه
    if (product.sellerId === auth.currentUser.uid) {
      Alert.alert('معلومة', 'لا يمكنك الشات حول منتجك الخاص');
      return;
    }

    setSelectedProduct(product);
    setShowChatModal(true);
    setChatMessages([]);
    setMessageText('');
  };

  // ✅ إرسال رسالة - مع إصلاحات كاملة
  const sendMessage = async () => {
    if (!auth.currentUser || !selectedProduct) {
      Alert.alert('خطأ', 'تعذر الوصول إلى البيانات');
      return;
    }

    const trimmedMessage = messageText.trim();
    
    if (trimmedMessage.length === 0) {
      Alert.alert('تنبيه', 'يرجى إدخال رسالة');
      return;
    }

    setSendingMessage(true);

    try {
      // ✅ إضافة الرسالة إلى قاعدة البيانات
      const newMessage = {
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        productImage: selectedProduct.imageURL,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email || 'مستخدم',
        receiverId: selectedProduct.sellerId,
        receiverName: selectedProduct.seller,
        text: trimmedMessage,
        timestamp: serverTimestamp(),
        read: false
      };

      const messageRef = await addDoc(collection(db, 'messages'), newMessage);
      console.log('✅ تم إضافة الرسالة بنجاح:', messageRef.id);

      // ✅ البحث عن المحادثة الموجودة أو إنشاء واحدة جديدة
      const convQuery = query(
        collection(db, 'conversations'),
        where('productId', '==', selectedProduct.id),
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      const convSnap = await getDocs(convQuery);

      if (convSnap.docs.length > 0) {
        // ✅ تحديث المحادثة الموجودة
        await updateDoc(doc(db, 'conversations', convSnap.docs[0].id), {
          lastMessage: trimmedMessage,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ تم تحديث المحادثة');
      } else {
        // ✅ إنشاء محادثة جديدة
        const newConv = await addDoc(collection(db, 'conversations'), {
          productId: selectedProduct.id,
          productTitle: selectedProduct.title,
          productImage: selectedProduct.imageURL,
          buyerId: auth.currentUser.uid,
          buyerName: auth.currentUser.displayName || auth.currentUser.email || 'مستخدم',
          sellerId: selectedProduct.sellerId,
          sellerName: selectedProduct.seller,
          participants: [auth.currentUser.uid, selectedProduct.sellerId],
          lastMessage: trimmedMessage,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ تم إنشاء محادثة جديدة:', newConv.id);
      }

      // ✅ مسح حقل الإدخال
      setMessageText('');

      // ✅ التمرير إلى نهاية الرسائل
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      Alert.alert('خطأ', `فشل إرسال الرسالة: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  /* ================= إضافة منتج ================= */
  // 📸 اختيار صورة
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert("خطأ", "نحتاج إذن الوصول للصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  // ☁️ رفع الصورة على Cloudinary
  const uploadToCloudinary = async (pickedImage: any) => {
    const data = new FormData();

    const response = await fetch(pickedImage.uri);
    const blob = await response.blob();

    data.append("file", blob);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error?.message || "Upload failed");
    }

    return result.secure_url;
  };

  // 📦 إضافة منتج
  const handleAddProduct = async () => {
    if (!auth.currentUser) {
      Alert.alert("خطأ", "لازم تسجلي دخول الأول");
      return;
    }

    if (!form.title || !form.price || !image) {
      Alert.alert("تنبيه", "الرجاء ملء كل الحقول واختيار صورة");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrl = await uploadToCloudinary(image);

      await addDoc(collection(db, "products"), {
        title: form.title,
        price: Number(form.price),
        category: form.category,
        imageURL: uploadedUrl,
        seller: auth.currentUser.displayName || auth.currentUser.email,
        sellerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        status: "active"
      });

      Alert.alert("تم ✅", "تم إضافة المنتج بنجاح");

      setForm({ title: '', price: '', category: 'كتب' });
      setImage(null);

      fetchProducts();

    } catch (err: any) {
      console.log("❌ خطأ في إضافة المنتج:", err);
      Alert.alert("خطأ", err.message || "فشل العملية");
    } finally {
      setLoading(false);
    }
  };

  /* ================= عرض المنتج ================= */
  // 🧾 عرض المنتج
  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageURL }} style={styles.cardImage} />
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardPrice}>{item.price} ج</Text>
      <Text style={styles.cardSeller} numberOfLines={1}>👤 {item.seller}</Text>

      {/* ✅ زر الشات */}
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => openChat(item)}
      >
        <Text style={styles.chatBtnText}>💬 شات</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        ListHeaderComponent={
          <>
            <Text style={styles.label}>صورة المنتج</Text>

            <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.image} />
              ) : (
                <Text style={{ color: '#888', fontSize: 16 }}>📷 اضغط لاختيار صورة</Text>
              )}
            </TouchableOpacity>

            <TextInput
              placeholder="اسم المنتج"
              style={styles.input}
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
              placeholderTextColor="#999"
            />

            <TextInput
              placeholder="السعر"
              style={styles.input}
              keyboardType="numeric"
              value={form.price}
              onChangeText={(p) => setForm({ ...form, price: p })}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.btn, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleAddProduct}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.btnText}>➕ إضافة المنتج</Text>
              }
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 30 }]}>
              🛍️ المنتجات الحالية ({products.length})
            </Text>
          </>
        }
      />

      {/* ✅ نافذة الشات */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChatModal(false)}
      >
        <View style={styles.chatContainer}>
          {/* ✅ رأس المحادثة */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>

            {selectedProduct && (
              <View style={styles.chatHeaderInfo}>
                <Image
                  source={{ uri: selectedProduct.imageURL }}
                  style={styles.chatProductImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatProductTitle} numberOfLines={1}>
                    {selectedProduct.title}
                  </Text>
                  <Text style={styles.chatProductSeller} numberOfLines={1}>
                    من: {selectedProduct.seller}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ width: 40 }} />
          </View>

          {/* ✅ الرسائل */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {loadingMessages ? (
              <View style={styles.loadingMessages}>
                <ActivityIndicator color="#1a3a2a" size="large" />
                <Text style={{ marginTop: 10, color: '#999' }}>جاري تحميل الرسائل...</Text>
              </View>
            ) : chatMessages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesIcon}>💬</Text>
                <Text style={styles.emptyMessagesText}>ابدأ المحادثة</Text>
              </View>
            ) : (
              chatMessages.map((msg) => {
                const isCurrentUser = msg.senderId === auth.currentUser?.uid;
                
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageGroup,
                      isCurrentUser ? styles.messageGroupRight : styles.messageGroupLeft
                    ]}
                  >
                    {/* ✅ اسم المرسل */}
                    <Text style={[
                      styles.senderName,
                      isCurrentUser ? styles.senderNameRight : styles.senderNameLeft
                    ]}>
                      {msg.senderName}
                    </Text>

                    {/* ✅ الفقاعة */}
                    <View
                      style={[
                        styles.messageBubble,
                        isCurrentUser
                          ? styles.messageBubbleRight
                          : styles.messageBubbleLeft,
                      ]}
                    >
                      <Text style={styles.messageBubbleText}>{msg.text}</Text>
                      <Text style={styles.messageTime}>
                        {msg.timestamp?.toDate?.().toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) || ''}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* ✅ إدخال الرسالة */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="اكتب رسالتك..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline={true}
              editable={!sendingMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { opacity: sendingMessage ? 0.6 : 1 }]}
              onPress={sendMessage}
              disabled={sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>📤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ================= التصميم ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },

  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    marginTop: 20, 
    color: '#1a3a2a' 
  },

  imageBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },

  image: { width: '100%', height: '100%' },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    textAlign: 'right',
    color: '#333'
  },

  btn: {
    backgroundColor: '#1a3a2a',
    padding: 18,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center'
  },

  btnText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  // ✅ كارت المنتج
  card: {
    width: '48%',
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },

  cardImage: { 
    width: '100%', 
    height: 120, 
    borderRadius: 10 
  },

  cardTitle: { 
    fontWeight: 'bold', 
    marginTop: 8, 
    fontSize: 12, 
    textAlign: 'center' 
  },

  cardPrice: { 
    color: '#c8a84b', 
    marginTop: 4, 
    fontWeight: 'bold' 
  },

  cardSeller: { 
    fontSize: 10, 
    marginTop: 2, 
    color: '#666' 
  },

  chatBtn: {
    backgroundColor: '#c8a84b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    alignItems: 'center'
  },

  chatBtnText: {
    color: '#1a3a2a',
    fontWeight: 'bold',
    fontSize: 12
  },

  // ✅ نافذة الشات
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 50
  },

  chatHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a3a2a',
    gap: 12
  },

  closeBtn: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold'
  },

  chatHeaderInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 10
  },

  chatProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8
  },

  chatProductTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },

  chatProductSeller: {
    color: '#c8a84b',
    fontSize: 10,
    marginTop: 2
  },

  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },

  loadingMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyMessages: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyMessagesIcon: {
    fontSize: 50,
    marginBottom: 10
  },

  emptyMessagesText: {
    color: '#999',
    fontSize: 14
  },

  // ✅ مجموعة الرسالة (اسم + فقاعة)
  messageGroup: {
    marginVertical: 8
  },

  messageGroupRight: {
    alignItems: 'flex-start'
  },

  messageGroupLeft: {
    alignItems: 'flex-end'
  },

  // ✅ اسم المرسل
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginHorizontal: 8,
  },

  senderNameRight: {
    color: '#1a3a2a',
    textAlign: 'left'
  },

  senderNameLeft: {
    color: '#c8a84b',
    textAlign: 'right'
  },

  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  messageBubbleRight: {
    backgroundColor: '#1a3a2a',
    borderTopLeftRadius: 0,
    marginLeft: 8
  },

  messageBubbleLeft: {
    backgroundColor: '#c8a84b',
    borderTopRightRadius: 0,
    marginRight: 8
  },

  messageBubbleText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'right'
  },

  messageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right'
  },

  chatInputContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8
  },

  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'right',
    color: '#333',
    maxHeight: 100
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a3a2a',
    justifyContent: 'center',
    alignItems: 'center'
  },

  sendBtnText: {
    fontSize: 18
  }
});