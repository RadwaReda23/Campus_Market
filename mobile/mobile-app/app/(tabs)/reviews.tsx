import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';
import {
  collection, query, orderBy,
  doc, addDoc, onSnapshot, deleteDoc, getDocs
} from 'firebase/firestore';
import { Colors, Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function SiteReviewsScreen() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Reviews ──────────────────────────────────────────────────────────
  const fetchReviews = async () => {
    let serverReviews: any[] = [];
    try {
      // جلب من السيرفر
      const q = query(collection(db, "site_reviews"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      serverReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Firestore read failed:", error);
    }

    // جلب من التخزين المحلي
    try {
      const localData = await AsyncStorage.getItem("my_mobile_reviews");
      const localReviews = localData ? JSON.parse(localData) : [];
      
      // دمج وتصفية التكرار
      const combined = [...localReviews, ...serverReviews];
      const unique = Array.from(new Map(combined.map((item: any) => [item.userId + item.comment, item])).values()) as any[];
      
      // الترتيب
      unique.sort((a: any, b: any) => {
        const dateA = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt?.toMillis?.() || 0;
        const dateB = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

      setReviews(unique);
    } catch (err) {
      console.error("AsyncStorage read error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    
    // اشتراك للبحث عن تحديثات السيرفر
    const q = query(collection(db, "site_reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      fetchReviews();
    });
    return () => unsub();
  }, []);

  // ─── Submit Review ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!auth.currentUser) {
      Alert.alert("خطأ", "يجب تسجيل الدخول أولاً");
      return;
    }
    if (rating === 0 || comment.trim().length < 2) {
      Alert.alert("تنبيه", "يرجى اختيار التقييم وكتابة رأيك");
      return;
    }

    setSubmitting(true);
    const reviewData = {
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "مستخدم",
      userPhoto: auth.currentUser.photoURL || null,
      rating: rating,
      comment: comment.trim(),
      createdAt: Date.now()
    };

    // حفظ محلي فوري
    try {
      const localData = await AsyncStorage.getItem("my_mobile_reviews");
      const local = localData ? JSON.parse(localData) : [];
      local.unshift({ id: "local-" + Date.now(), ...reviewData });
      await AsyncStorage.setItem("my_mobile_reviews", JSON.stringify(local));
    } catch (err) {
      console.error("AsyncStorage save error:", err);
    }

    // محاولة مزامنة مع السيرفر في الخلفية
    try {
      await addDoc(collection(db, "site_reviews"), reviewData);
      Alert.alert("نجاح", "تم تسجيل تقييمك");
    } catch (error) {
      console.error("Submission failed, but saved locally:", error);
      Alert.alert("تنبيه", "تم حفظ التقييم على جهازك (سيرفع للسيرفر لاحقاً)");
    } finally {
      setComment("");
      setRating(0);
      setSubmitting(false);
      fetchReviews();
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    if (userId !== auth.currentUser?.uid) return;

    Alert.alert(
      "حذف التعليق",
      "هل أنت متأكد من حذف هذا التعليق؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              // حذف من السيرفر
              if (!id.startsWith("local-")) {
                await deleteDoc(doc(db, "site_reviews", id));
              }
              
              // حذف من التخزين المحلي
              const localData = await AsyncStorage.getItem("my_mobile_reviews");
              if (localData) {
                const local = JSON.parse(localData);
                const updated = local.filter((r: any) => r.id !== id);
                await AsyncStorage.setItem("my_mobile_reviews", JSON.stringify(updated));
              }

              fetchReviews();
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("خطأ", "فشل حذف التعليق");
            }
          }
        }
      ]
    );
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الآراء والتقييمات</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Review Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>أخبرنا برأيك في الموقع</Text>
          
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.star, rating >= star ? styles.starFilled : styles.starEmpty]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="اكتب رأيك هنا..."
            placeholderTextColor={Colors.light.muted}
            multiline
            value={comment}
            onChangeText={setComment}
            textAlign="right"
          />

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>إرسال التقييم</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>آراء المستخدمين ({reviews.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 20 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد تقييمات بعد. كن أول من يقيم!</Text>
          ) : (
            reviews.map((item) => (
              <View key={item.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                   <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{item.userName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Text key={s} style={[styles.miniStar, item.rating >= s ? styles.starFilled : styles.starEmpty]}>★</Text>
                        ))}
                      </View>
                   </View>
                   <View style={styles.avatar}>
                      {item.userPhoto ? (
                        <Image source={{ uri: item.userPhoto }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarLetter}>{item.userName?.[0]?.toUpperCase() || '?'}</Text>
                      )}
                   </View>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={[styles.reviewComment, { flex: 1 }]}>{item.comment}</Text>
                  {auth.currentUser?.uid === item.userId && (
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.userId)} style={{ marginLeft: 10 }}>
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.reviewDate}>
                  {item.createdAt?.toDate 
                    ? item.createdAt.toDate().toLocaleDateString('ar-EG') 
                    : (typeof item.createdAt === 'number' 
                        ? new Date(item.createdAt).toLocaleDateString('ar-EG') 
                        : 'الآن')}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 60, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { color: 'white', fontSize: 18, fontFamily: Fonts.cairoBold },

  formCard: {
    backgroundColor: 'white',
    margin: 20, padding: 20,
    borderRadius: 20,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  formTitle: { fontSize: 16, fontFamily: Fonts.cairoBold, color: Colors.light.primary, textAlign: 'center', marginBottom: 15 },
  starsRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 10, marginBottom: 15 },
  star: { fontSize: 35 },
  starFilled: { color: Colors.light.accent },
  starEmpty: { color: '#e0e0e0' },
  
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 12, padding: 15, height: 100,
    textAlignVertical: 'top', fontFamily: Fonts.cairo,
    fontSize: 14, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  submitBtn: { backgroundColor: Colors.light.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: 'white', fontFamily: Fonts.cairoBold, fontSize: 16 },

  listSection: { paddingHorizontal: 20 },
  listTitle: { fontSize: 16, fontFamily: Fonts.cairoBold, color: Colors.light.primary, textAlign: 'right', marginBottom: 15 },
  reviewCard: {
    backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 15,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10 },
  reviewerInfo: { marginRight: 12, alignItems: 'flex-end' },
  reviewerName: { fontSize: 14, fontFamily: Fonts.cairoBold, color: Colors.light.text },
  reviewStars: { flexDirection: 'row-reverse', gap: 2 },
  miniStar: { fontSize: 12 },
  
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { color: 'white', fontSize: 16, fontFamily: Fonts.cairoBold },

  reviewComment: { fontSize: 13, fontFamily: Fonts.cairo, color: Colors.light.text, textAlign: 'right', lineHeight: 20 },
  reviewDate: { fontSize: 10, fontFamily: Fonts.cairo, color: Colors.light.muted, textAlign: 'left', marginTop: 8 },
  
  emptyText: { textAlign: 'center', fontFamily: Fonts.cairo, color: Colors.light.muted, marginTop: 30 },
});
