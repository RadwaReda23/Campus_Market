import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  Alert,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { getAuth, updateProfile } from "firebase/auth";

export default function Profile() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // تحميل بيانات المستخدم
  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setImage(user.photoURL || null);
    }
  }, []);

  // =========================
  // اختيار صورة
  // =========================
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // =========================
  // رفع الصورة على Cloudinary
  // =========================
  const uploadImage = async (imageUri: string) => {
    try {
      const data = new FormData();

      data.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);

      // ⚠️ لازم يكون unsigned preset
      data.append("upload_preset", "unsigned_preset");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dz4nwclvu/image/upload",
        {
          method: "POST",
          body: data,
        }
      );

      const result = await res.json();

      console.log("Cloudinary response:", result);

      if (!result.secure_url) {
        throw new Error("Upload failed");
      }

      return result.secure_url;
    } catch (error) {
      console.log("Upload error:", error);
      Alert.alert("خطأ", "فشل رفع الصورة");
      return null;
    }
  };

  // =========================
  // حفظ التعديلات
  // =========================
  const saveChanges = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let imageUrl = user.photoURL;

      // لو المستخدم اختار صورة جديدة
      if (image && image !== user.photoURL) {
        const uploaded = await uploadImage(image);
        if (uploaded) imageUrl = uploaded;
      }

      await updateProfile(user, {
        displayName: name,
        photoURL: imageUrl,
      });

      // تحديث البيانات فوراً
      await user.reload();

      Alert.alert("تم", "تم حفظ التعديلات بنجاح ✅");
    } catch (error) {
      console.log(error);
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <View style={{ padding: 20 }}>

      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        حسابي
      </Text>

      {image && (
        <Image
          source={{ uri: image }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            marginBottom: 10,
          }}
        />
      )}

      <Button title="اختيار صورة" onPress={pickImage} />

      <TextInput
        placeholder="الاسم"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          marginVertical: 15,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <Button
        title={loading ? "جارى الحفظ..." : "حفظ التعديلات"}
        onPress={saveChanges}
        disabled={loading}
      />
    </View>
  );
}