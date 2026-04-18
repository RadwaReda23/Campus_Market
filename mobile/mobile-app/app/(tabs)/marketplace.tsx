import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  imageURL: string;
  seller: string;
  sellerId: string;
  description?: string;
  createdAt?: any;
}

export default function ProductsScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickMessage, setQuickMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [productMessages, setProductMessages] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);
  const [mediaMenuVisible, setMediaMenuVisible] = useState(false);

  useEffect(() => {
    if (!selectedProduct || !user) {
      setProductMessages([]);
      return;
    }
    const chatId = `${selectedProduct.id}_${user.uid}`;
    const q = query(collection(db, "productChats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProductMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedProduct, user]);

  const categories = ["الكل", "كتب", "دروس", "ملخصات", "أخرى"];

  /* ================= LOAD PRODUCTS ================= */
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      setProducts(list);
    } catch (err: any) {
      console.error("❌ خطأ في تحميل المنتجات:", err);
      Alert.alert("خطأ", "فشل تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER PRODUCTS ================= */
  const filteredProducts = products.filter(product => {
    const matchSearch = product.title.toLowerCase().includes(searchText.toLowerCase()) ||
                       product.seller?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchCategory = selectedCategory === "الكل" || 
                         product.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  // ── رفع الميديا على Cloudinary ──
  const uploadToCloudinary = async (uri: string, isVideo: boolean) => {
    const data = new FormData();
    data.append("file", {
      uri: uri,
      type: isVideo ? "video/mp4" : "image/jpeg",
      name: isVideo ? "upload.mp4" : "upload.jpg",
    } as any);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("folder", "chat_media");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();
    if (!result.secure_url) throw new Error(result.error?.message || "Upload failed");
    return result.secure_url;
  };

  const sendMedia = async (uri: string, isVideo: boolean) => {
    if (!selectedProduct || !user) return;
    setUploadingMedia(true);
    try {
      const mediaURL = await uploadToCloudinary(uri, isVideo);
      const chatId = `${selectedProduct.id}_${user.uid}`;
      const chatRef = doc(db, "productChats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          productId: selectedProduct.id,
          title: `استفسار عن: ${selectedProduct.title}`,
          imageURL: selectedProduct.imageURL,
          buyerId: user.uid,
          sellerId: selectedProduct.sellerId,
          type: "productChat",
          createdAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "productChats", chatId, "messages"), {
        text: "",
        mediaURL,
        mediaType: isVideo ? "video" : "image",
        senderId: user.uid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        reactions: {}
      });
    } catch (e) {
      Alert.alert("خطأ", "فشل رفع الميديا");
      console.error(e);
    } finally {
      setUploadingMedia(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) await sendMedia(result.assets[0].uri, false);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الميديا"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled) await sendMedia(result.assets[0].uri, true);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("خطأ", "نحتاج إذن الكاميرا"); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (!result.canceled) {
      const isVideo = result.assets[0].type === "video";
      await sendMedia(result.assets[0].uri, isVideo);
    }
  };

  const showMediaOptions = () => {
    setMediaMenuVisible(true);
  };

  /* ================= OPEN PRODUCT MODAL ================= */
  const openProductDetails = (product: Product) => {
    if (!user) {
      Alert.alert("خطأ", "يرجى تسجيل الدخول أولاً");
      return;
    }
    if (product.sellerId === user.uid) {
      Alert.alert("معلومة", "لا يمكنك مراسلة نفسك عن منتجك");
      return;
    }
    setSelectedProduct(product);
    setQuickMessage("");
  };

  /* ================= SEND QUICK MESSAGE ================= */
  const sendQuickMessage = async () => {
    if (!selectedProduct || !user) return;
    
    setSendingMessage(true);
    try {
      const chatId = `${selectedProduct.id}_${user.uid}`;
      const chatRef = doc(db, "productChats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          productId: selectedProduct.id,
          title: `استفسار عن: ${selectedProduct.title}`,
          imageURL: selectedProduct.imageURL,
          buyerId: user.uid,
          sellerId: selectedProduct.sellerId,
          type: "productChat",
          createdAt: serverTimestamp(),
        });
      }

      if (quickMessage.trim() !== "") {
        await addDoc(collection(db, "productChats", chatId, "messages"), {
          text: quickMessage.trim(),
          senderId: user.uid,
          senderEmail: user.email,
          senderName: user.displayName || user.email,
          createdAt: serverTimestamp(),
          reactions: {},
          mediaType: "text"
        });
        setQuickMessage("");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("خطأ", "حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setSendingMessage(false);
    }
  };

  /* ================= RENDER PRODUCT ITEM ================= */
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => openProductDetails(item)}
    >
      <Image
        source={{ uri: item.imageURL }}
        style={styles.productImage}
      />

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.productPrice}>
          {item.price} ج.م
        </Text>

        <View style={styles.productFooter}>
          <Text style={styles.productSeller} numberOfLines={1}>
            من: {item.seller}
          </Text>
          <TouchableOpacity style={styles.chatBtn}>
            <Text style={styles.chatBtnText}>💬 شات</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛍️ المنتجات</Text>
        <Text style={styles.headerSubtitle}>
          {filteredProducts.length} منتج
        </Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن منتج أو بائع..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {/* CATEGORIES */}
      <View style={styles.categoriesContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryBtn,
              selectedCategory === category && styles.categoryBtnActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryBtnText,
                selectedCategory === category && styles.categoryBtnTextActive
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PRODUCTS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a2a" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>لم يتم العثور على منتجات</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchProducts}
          >
            <Text style={styles.refreshBtnText}>🔄 إعادة تحميل</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL: PRODUCT DETAILS & QUICK CHAT */}
      {!!selectedProduct && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 10 }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
            <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProduct(null)}>
                <Text style={styles.closeBtnText}>✖</Text>
              </TouchableOpacity>

              {selectedProduct && (
                <FlatList
                  data={productMessages}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={() => (
                    <View style={{ paddingBottom: 10, borderBottomWidth: 1, borderColor: "#eee", marginBottom: 10 }}>
                      <Image source={{ uri: selectedProduct.imageURL }} style={styles.modalImage} />
                      <View style={styles.modalDetails}>
                        <Text style={styles.modalTitle}>{selectedProduct.title}</Text>
                        <Text style={styles.modalPrice}>{selectedProduct.price} ج.م</Text>
                        <Text style={styles.modalSeller}>البائع: {selectedProduct.seller}</Text>
                        {selectedProduct.description ? (
                          <Text style={styles.modalDesc}>{selectedProduct.description}</Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                  renderItem={({ item }) => {
                    const isMe = item.senderId === user?.uid;
                    return (
                      <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                        {item.mediaType === "image" && item.mediaURL && (
                          <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "image" })}>
                            <Image source={{ uri: item.mediaURL }} style={styles.msgImage} resizeMode="cover" />
                          </TouchableOpacity>
                        )}

                        {item.mediaType === "video" && item.mediaURL && (
                          <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.mediaURL, type: "video" })} style={styles.videoThumb}>
                            <Text style={styles.videoPlayIcon}>▶️</Text>
                            <Text style={styles.videoLabel}>اضغط لتشغيل الفيديو</Text>
                          </TouchableOpacity>
                        )}

                        {!!item.text && (
                          <Text style={[styles.msgText, isMe ? styles.txtMe : styles.txtOther]}>{item.text}</Text>
                        )}
                      </View>
                    );
                  }}
                />
              )}

              <View style={styles.quickMessageContainer}>
                <TouchableOpacity onPress={showMediaOptions} style={styles.mediaBtn} disabled={uploadingMedia}>
                  {uploadingMedia ? (
                    <ActivityIndicator size="small" color="#1a3a2a" />
                  ) : (
                    <Text style={{ fontSize: 22 }}>📎</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.quickMessageInput}
                  value={quickMessage}
                  onChangeText={setQuickMessage}
                  multiline
                  placeholder="اكتب رسالة..."
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendQuickMessage} disabled={sendingMessage}>
                  {sendingMessage ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendBtnText}>إرسال</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Media Menu */}
            {mediaMenuVisible && (
              <TouchableOpacity style={styles.mediaMenuOverlay} activeOpacity={1} onPress={() => setMediaMenuVisible(false)}>
                <View style={styles.mediaMenuBox}>
                  <Text style={styles.mediaMenuTitle}>اختر المرفق</Text>
                  
                  <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); pickImage(); }}>
                    <Text style={styles.mediaMenuBtnText}>📷 صورة من المعرض</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); pickVideo(); }}>
                    <Text style={styles.mediaMenuBtnText}>🎥 فيديو من المعرض</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.mediaMenuBtn} onPress={() => { setMediaMenuVisible(false); openCamera(); }}>
                    <Text style={styles.mediaMenuBtnText}>📸 كاميرا</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.mediaMenuBtn, styles.mediaMenuCancelBtn]} onPress={() => setMediaMenuVisible(false)}>
                    <Text style={styles.mediaMenuCancelText}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Preview Modal للصور والفيديو */}
      {!!previewMedia && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 20 }]}>
          <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewMedia(null)}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewMedia?.type === "image" && (
            <Image source={{ uri: previewMedia.uri }} style={styles.previewImage} resizeMode="contain" />
          )}
          {previewMedia?.type === "video" && (
            <Video
              source={{ uri: previewMedia.uri }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode={"contain" as any}
              shouldPlay
            />
          )}
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    padding: 20,
    backgroundColor: "#1a3a2a",
    paddingTop: 50,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#c8a84b",
    marginTop: 4,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    position: "relative",
    marginBottom: 4,
  },

  searchInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 40,
    paddingVertical: 10,
    fontSize: 13,
    color: "#333",
    textAlign: "right",
  },

  searchIcon: {
    position: "absolute",
    right: 28,
    top: 20,
    fontSize: 16,
  },

  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row-reverse",
    gap: 8,
  },

  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  categoryBtnActive: {
    backgroundColor: "#1a3a2a",
    borderColor: "#1a3a2a",
  },

  categoryBtnText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  categoryBtnTextActive: {
    color: "#ffffff",
  },

  columnWrapper: {
    gap: 12,
    paddingHorizontal: 12,
  },

  listContent: {
    paddingVertical: 12,
  },

  productCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  productImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#f0f0f0",
  },

  productInfo: {
    padding: 10,
  },

  productTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a3a2a",
    marginBottom: 6,
    lineHeight: 16,
  },

  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#c8a84b",
    marginBottom: 8,
  },

  productFooter: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  productSeller: {
    fontSize: 10,
    color: "#999",
    flex: 1,
  },

  chatBtn: {
    backgroundColor: "#1a3a2a",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },

  chatBtnText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "bold",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
  },

  refreshBtn: {
    backgroundColor: "#1a3a2a",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  refreshBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 40,
    maxHeight: "85%",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  closeBtnText: {
    fontSize: 24,
    color: "#555",
  },
  modalImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a3a2a",
    marginBottom: 10,
    textAlign: "right",
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c8a84b",
    marginBottom: 5,
    textAlign: "right",
  },
  modalSeller: {
    fontSize: 14,
    color: "#777",
    marginBottom: 15,
    textAlign: "right",
  },
  modalDesc: {
    fontSize: 14,
    color: "#444",
    lineHeight: 22,
    textAlign: "right",
  },
  quickMessageContainer: {
    flexDirection: "row-reverse",
    padding: 15,
    paddingBottom: Platform.OS === "android" ? 90 : 80,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
  quickMessageInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 45,
    maxHeight: 100,
    textAlign: "right",
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: "#1a3a2a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  // Messages styling inside Modal
  msgBubble: {
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 15,
    marginVertical: 4,
    maxWidth: "80%",
  },
  msgMe: {
    backgroundColor: "#dcf8c6",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
  msgOther: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-end",
    borderTopRightRadius: 0,
  },
  msgText: {
    fontSize: 14,
    color: "#333",
  },
  txtMe: {
    textAlign: "left",
  },
  txtOther: {
    textAlign: "right",
  },
  mediaBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 22,
    marginRight: 8,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
  },
  videoThumb: {
    width: 200,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  videoPlayIcon: {
    fontSize: 36,
  },
  videoLabel: {
    color: "white",
    fontSize: 11,
    marginTop: 4,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center"
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  previewCloseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold"
  },
  previewImage: {
    width: "100%",
    height: "80%"
  },
  previewVideo: {
    width: "100%",
    height: 300
  },
  mediaMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 2000,
  },
  mediaMenuBox: {
    backgroundColor: "#fff",
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  mediaMenuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  mediaMenuBtn: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mediaMenuBtnText: {
    fontSize: 16,
    color: "#075e54",
    textAlign: "center",
  },
  mediaMenuCancelBtn: {
    borderBottomWidth: 0,
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  mediaMenuCancelText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    fontWeight: "bold",
  },
});