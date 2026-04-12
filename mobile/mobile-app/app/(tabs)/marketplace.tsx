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
} from "react-native";

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

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

  /* ================= OPEN CHAT ================= */
  const openChat = async (product: Product) => {
    if (!user) {
      Alert.alert("خطأ", "يرجى تسجيل الدخول أولاً");
      return;
    }

    if (product.sellerId === user.uid) {
      Alert.alert("معلومة", "لا يمكنك الشات حول منتجك الخاص");
      return;
    }

    // التنقل إلى صفحة الشات مع تمرير معرّف المنتج
    router.push({
      pathname: "/(tabs)/messages",
      params: { productId: product.id }
    });
  };

  /* ================= RENDER PRODUCT ITEM ================= */
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => openChat(item)}
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
});