import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, 
  StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CLOUDINARY_CLOUD_NAME = "dgowyewii";
const CLOUDINARY_UPLOAD_PRESET = "nlkvsjlj";

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  imageURL: string;
  seller: string;
}

export default function ProductsScreen() {
  const [form, setForm] = useState({ title: '', price: '', category: 'كتب' });
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(list);
    } catch (err) {
      console.log(err);
    }
  };

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
      const picked = result.assets[0];
      setImage(picked);
    }
  };

  const uploadToCloudinary = async (pickedImage: any) => {
    const data = new FormData();

    data.append("file", {
      uri: pickedImage.uri,
      type: pickedImage.type || "image/jpeg",
      name: pickedImage.uri.split("/").pop() || `upload.jpg`,
    } as any);

    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await res.json();
    return result.secure_url;
  };

  const handleAddProduct = async () => {
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
        seller: auth.currentUser?.displayName || auth.currentUser?.email,
        sellerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        status: "active"
      });

      Alert.alert("تم ✅", "تم إضافة المنتج بنجاح");
      setForm({ title: '', price: '', category: 'كتب' });
      setImage(null);
      fetchProducts();
    } catch (err) {
      console.log(err);
      Alert.alert("خطأ", "فشل الرفع، تأكد من إعدادات Cloudinary");
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageURL }} style={styles.cardImage} />
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardPrice}>{item.price} ج</Text>
      <Text style={styles.cardSeller}>👤 {item.seller}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>صورة المنتج</Text>
      <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.image} />
        ) : (
          <Text style={{ color: '#888' }}>📷 اضغط لاختيار صورة</Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="اسم المنتج"
        style={styles.input}
        value={form.title}
        onChangeText={(t) => setForm({ ...form, title: t })}
      />

      <TextInput
        placeholder="السعر"
        style={styles.input}
        keyboardType="numeric"
        value={form.price}
        onChangeText={(p) => setForm({ ...form, price: p })}
      />

      <TouchableOpacity
        style={[styles.btn, { opacity: loading ? 0.6 : 1 }]}
        onPress={handleAddProduct}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>إضافة المنتج</Text>}
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 30 }]}>المنتجات الحالية</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        horizontal={false}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
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
    textAlign: 'right'
  },
  btn: {
    backgroundColor: '#1a3a2a',
    padding: 18,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center'
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    margin: 5,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cardImage: { width: '100%', height: 120, borderRadius: 10 },
  cardTitle: { fontWeight: 'bold', marginTop: 8 },
  cardPrice: { color: '#c8a84b', marginTop: 4 },
  cardSeller: { fontSize: 10, marginTop: 2 }
});