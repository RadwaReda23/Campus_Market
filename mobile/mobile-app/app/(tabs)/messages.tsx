import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";

import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { auth, db } from "../firebase";

const { width, height } = Dimensions.get("window");

export default function MessagesScreen() {
  const user = auth.currentUser;
  const flatListRef = useRef<any>(null);
  const sidebarRef = useRef<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [messagesMap, setMessagesMap] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  // ✅ للتحكم في عرض الرد على التعليقات
  const [replyingToReaction, setReplyingToReaction] = useState<any>(null);
  const [showReplyReactionPicker, setShowReplyReactionPicker] = useState<string | null>(null);

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉"];

  const getCollectionName = (item: any) => {
    return item?.type === "lost" ? "lost" : "library";
  };

  /* ================= LOAD ITEMS ================= */
  // ✅ تحميل جميع العناصر من Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const libSnap = await getDocs(collection(db, "library"));
        const lostSnap = await getDocs(collection(db, "lost"));

        const libData = libSnap.docs.map((d) => ({
          id: d.id,
          type: "library",
          ...d.data(),
        }));

        const lostData = lostSnap.docs.map((d) => ({
          id: d.id,
          type: "lost",
          ...d.data(),
        }));

        const all = [...libData, ...lostData];
        setItems(all);
        if (all.length > 0) {
          setSelectedItem(all[0]);
        }
      } catch (error) {
        console.error("Error loading items:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ================= REALTIME MESSAGES ================= */
  // ✅ الاستماع لرسائل كل عنصر في الوقت الفعلي
  useEffect(() => {
    if (!items.length) return;

    const unsubscribers: any[] = [];

    items.forEach((item) => {
      const q = query(
        collection(db, getCollectionName(item), item.id, "messages"),
        orderBy("createdAt", "asc")
      );

      const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setMessagesMap((prev: any) => ({
          ...prev,
          [item.id]: msgs,
        }));
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [items]);

  /* ================= LOAD PARTICIPANTS ================= */
  // ✅ تحميل المشاركين في المحادثة
  const loadParticipants = async (itemId: string) => {
    const msgs = messagesMap[itemId] || [];
    const uniqueParticipants = Array.from(
      new Set(msgs.map((m: any) => m.senderEmail))
    ).map((email) => ({
      email,
      name: msgs.find((m: any) => m.senderEmail === email)?.senderName || email,
    }));

    setParticipants(uniqueParticipants);
  };

  /* ================= MARK AS READ ================= */
  // ✅ وضع علامة على الرسائل كمقروءة
  const markAsRead = async (item: any, itemId: string) => {
    const msgs = messagesMap[itemId] || [];

    msgs.forEach(async (m: any) => {
      if (!m.readBy?.includes(user?.email)) {
        await updateDoc(
          doc(db, getCollectionName(item), itemId, "messages", m.id),
          {
            readBy: arrayUnion(user?.email),
          }
        );
      }
    });
  };

  /* ================= REQUEST PERMISSIONS ================= */
  // ✅ طلب صلاحيات الكاميرا والمعرض
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    return cameraPermission.granted && libraryPermission.granted;
  };

  /* ================= PICK IMAGE ================= */
  // ✅ اختيار صورة من المعرض
  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      
      if (!hasPermission) {
        Alert.alert("خطأ", "يرجى التحقق من صلاحيات التطبيق");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const imageUri = result.assets[0].uri;
        await sendMediaMessage(imageUri, "image");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("خطأ", `فشل في اختيار الصورة: ${error}`);
    }
  };

  /* ================= PICK VIDEO ================= */
  // ✅ اختيار فيديو من المعرض
  const pickVideo = async () => {
    try {
      const hasPermission = await requestPermissions();
      
      if (!hasPermission) {
        Alert.alert("خطأ", "يرجى التحقق من صلاحيات التطبيق");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const videoUri = result.assets[0].uri;
        await sendMediaMessage(videoUri, "video");
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("خطأ", `فشل في اختيار الفيديو: ${error}`);
    }
  };

  /* ================= SEND MEDIA MESSAGE ================= */
  // ✅ إرسال الصور والفيديوهات
  const sendMediaMessage = async (uri: string, type: "image" | "video") => {
    if (!selectedItem || !user) {
      Alert.alert("خطأ", "الرجاء اختيار محادثة أولاً");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      console.log(`🚀 إرسال ${type}...`);
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        throw new Error("الملف غير موجود");
      }

      setUploadProgress(30);

      // ✅ قراءة الملف كـ base64
      let base64String: string;
      
      try {
        base64String = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
      } catch (readError) {
        console.error("Error reading file:", readError);
        throw new Error("فشل في قراءة الملف");
      }

      if (!base64String || base64String.length === 0) {
        throw new Error("الملف فارغ");
      }

      setUploadProgress(60);

      // ✅ إنشاء Media URL
      const mimeType = type === "image" ? "image/jpeg" : "video/mp4";
      const mediaUrl = `data:${mimeType};base64,${base64String}`;

      setUploadProgress(80);

      // ✅ إنشاء كائن الرسالة مع reactions و reactionReactions
      const messageData = {
        text: type === "image" ? "[📸 صورة]" : "[🎬 فيديو]",
        mediaUrl: mediaUrl,
        mediaType: type,
        senderId: user.uid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        senderPhoto: user.photoURL || null,
        createdAt: serverTimestamp(),
        readBy: [user.email],
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: replyingTo.text,
              senderName: replyingTo.senderName,
            }
          : null,
        reactions: {}, // ✅ مجموعة الرياكشن على الرسالة
        reactionReactions: {}, // ✅ مجموعة الرياكشن على الرياكشن
      };

      // ✅ حفظ في Firestore
      const docRef = await addDoc(
        collection(
          db,
          getCollectionName(selectedItem),
          selectedItem.id,
          "messages"
        ),
        messageData
      );

      console.log(`✅ تم إرسال ${type} بنجاح: ${docRef.id}`);
      setUploadProgress(100);
      setText("");
      setReplyingTo(null);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);

      Alert.alert("نجاح", `تم إرسال ${type === "image" ? "الصورة" : "الفيديو"} بنجاح`);
    } catch (error) {
      console.error(`❌ خطأ في إرسال ${type}:`, error);
      Alert.alert("خطأ", `فشل في إرسال ${type === "image" ? "الصورة" : "الفيديو"}: ${error}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* ================= SEND TEXT MESSAGE ================= */
  // ✅ إرسال الرسائل النصية
  const sendMessage = async () => {
    if (!text.trim() || !selectedItem || !user) return;

    try {
      // ✅ إنشاء رسالة نصية مع reactions و reactionReactions
      await addDoc(
        collection(
          db,
          getCollectionName(selectedItem),
          selectedItem.id,
          "messages"
        ),
        {
          text: text.trim(),
          senderId: user.uid,
          senderEmail: user.email,
          senderName: user.displayName || user.email,
          senderPhoto: user.photoURL || null,
          createdAt: serverTimestamp(),
          readBy: [user.email],
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text,
                senderName: replyingTo.senderName,
              }
            : null,
          reactions: {}, // ✅ مجموعة الرياكشن على الرسالة
          reactionReactions: {}, // ✅ مجموعة الرياكشن على الرياكشن
        }
      );

      setText("");
      setReplyingTo(null);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("خطأ", "فشل في إرسال الرسالة");
    }
  };

  /* ================= ADD REACTION ON MESSAGE ================= */
  // ✅ إضافة رياكشن على الرسالة (اضغط طويل على الرسالة)
  const addReaction = async (emoji: string, messageId: string) => {
    if (!selectedItem || !user) return;

    try {
      const msgRef = doc(
        db,
        getCollectionName(selectedItem),
        selectedItem.id,
        "messages",
        messageId
      );

      const msgs = messagesMap[selectedItem?.id] || [];
      const message = msgs.find((m: any) => m.id === messageId);

      // ✅ احصل على جميع الرياكشن الموجودة
      const reactions = message?.reactions || {};
      const key = `${emoji}_${user.email}`;

      // ✅ إذا كان لديك رياكشن بالفعل، احذفه (toggle)
      if (reactions[key]) {
        delete reactions[key];
        console.log(`❌ تم حذف الرياكشن: ${emoji}`);
      } else {
        // ✅ أضف رياكشن جديد
        reactions[key] = {
          emoji,
          userEmail: user.email,
          userName: user.displayName || user.email,
        };
        console.log(`✅ تم إضافة الرياكشن: ${emoji}`);
      }

      // ✅ حدّث في Firestore
      await updateDoc(msgRef, { reactions });
      setShowReactionPicker(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
      Alert.alert("خطأ", "فشل في إضافة الرياكشن");
    }
  };

  /* ================= ADD REACTION ON REACTION ================= */
  // ✅ إضافة رياكشن على الرياكشن (اضغط طويل على الرياكشن نفسه)
  const addReactionOnReaction = async (
    emoji: string,
    reactionKey: string,
    messageId: string
  ) => {
    if (!selectedItem || !user) return;

    try {
      const msgRef = doc(
        db,
        getCollectionName(selectedItem),
        selectedItem.id,
        "messages",
        messageId
      );

      const msgs = messagesMap[selectedItem?.id] || [];
      const message = msgs.find((m: any) => m.id === messageId);

      // ✅ إنشاء reactionReactions إذا لم تكن موجودة
      if (!message.reactionReactions) {
        await updateDoc(msgRef, {
          reactionReactions: {},
        });
      }

      // ✅ احصل على جميع ردود الرياكشن
      const allReactionReactions = message.reactionReactions || {};
      const reactionReactionsKey = `${reactionKey}_${emoji}_${user.email}`;

      // ✅ إذا كان لديك رد على الرياكشن بالفعل، احذفه (toggle)
      if (allReactionReactions[reactionReactionsKey]) {
        delete allReactionReactions[reactionReactionsKey];
        console.log(`❌ تم حذف الرد على الرياكشن: ${emoji}`);
      } else {
        // ✅ أضف رد جديد على الرياكشن
        allReactionReactions[reactionReactionsKey] = {
          emoji,
          reactionKey: reactionKey,
          userEmail: user.email,
          userName: user.displayName || user.email,
          createdAt: new Date().toISOString(),
        };
        console.log(`✅ تم إضافة الرد على الرياكشن: ${emoji}`);
      }

      // ✅ حدّث في Firestore
      await updateDoc(msgRef, {
        reactionReactions: allReactionReactions,
      });

      setShowReplyReactionPicker(null);
      setReplyingToReaction(null);
    } catch (error) {
      console.error("Error adding reaction on reaction:", error);
      Alert.alert("خطأ", "فشل في إضافة الرد على الرياكشن");
    }
  };

  /* ================= GET REACTIONS GROUP ================= */
  // ✅ تجميع الرياكشن حسب النوع (👍 معاهم كم واحد)
  const getReactionsGroup = (messageReactions: any) => {
    if (!messageReactions) return {};

    const grouped: any = {};
    Object.values(messageReactions).forEach((reaction: any) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = [];
      }
      grouped[reaction.emoji].push(reaction.userName);
    });

    return grouped;
  };

  /* ================= GET REACTIONS ON REACTION GROUP ================= */
  // ✅ تجميع الردود على الرياكشن حسب النوع
  const getReactionsOnReactionGroup = (
    reactionReactions: any,
    reactionKey: string
  ) => {
    if (!reactionReactions) return {};

    const grouped: any = {};
    Object.entries(reactionReactions).forEach(([key, reaction]: any) => {
      // ✅ تصفية الردود التي تخص هذا الرياكشن فقط
      if (reaction.reactionKey === reactionKey) {
        if (!grouped[reaction.emoji]) {
          grouped[reaction.emoji] = [];
        }
        grouped[reaction.emoji].push(reaction.userName);
      }
    });

    return grouped;
  };

  /* ================= HELPERS ================= */
  // ✅ التعديلات المساعدة
  const getLastMessage = (id: string) => {
    const msgs = messagesMap[id] || [];
    return msgs.length ? msgs[msgs.length - 1] : null;
  };

  const getUnreadCount = (id: string) => {
    const msgs = messagesMap[id] || [];

    return msgs.filter(
      (m: any) => m.senderId !== user?.uid && !m.readBy?.includes(user?.email)
    ).length;
  };

  const formatTime = (date: any) => {
    if (!date) return "";

    const d = date?.toDate ? date.toDate() : new Date(date);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ================= SORT & FILTER ================= */
  // ✅ ترتيب وتصفية المحادثات
  const sortedItems = [...items].sort((a, b) => {
    const aMsg = getLastMessage(a.id);
    const bMsg = getLastMessage(b.id);

    const aTime = aMsg?.createdAt?.toDate?.()?.getTime?.() || 0;
    const bTime = bMsg?.createdAt?.toDate?.()?.getTime?.() || 0;

    return bTime - aTime;
  });

  const filteredItems = showUnreadOnly
    ? sortedItems.filter((i) => getUnreadCount(i.id) > 0)
    : sortedItems.filter((i) =>
        i.title.toLowerCase().includes(searchText.toLowerCase())
      );

  /* ================= RENDER ================= */
  return (
    <View style={styles.mainContainer}>
      {/* ✅ SIDEBAR - قائمة المحادثات */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>💬 الرسائل</Text>
        </View>

        {/* SEARCH & FILTER */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن محادثة..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          style={styles.filterBtn}
        >
          <Text style={styles.filterBtnText}>
            {showUnreadOnly ? "✓ غير مقروء فقط" : "الكل"}
          </Text>
        </TouchableOpacity>

        {/* CHAT LIST */}
        <FlatList
          ref={sidebarRef}
          data={filteredItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const last = getLastMessage(item.id);
            const unread = getUnreadCount(item.id);
            const isSelected = selectedItem?.id === item.id;

            return (
              <TouchableOpacity
                style={[
                  styles.sidebarChatItem,
                  isSelected && styles.sidebarChatItemSelected,
                ]}
                onPress={() => {
                  setSelectedItem(item);
                  loadParticipants(item.id);
                  markAsRead(item, item.id);
                }}
              >
                <Image
                  source={{ uri: item.imageURL }}
                  style={styles.sidebarImg}
                />

                <View style={{ flex: 1 }}>
                  <View style={styles.sidebarChatHeader}>
                    <Text style={styles.sidebarTime}>
                      {formatTime(last?.createdAt)}
                    </Text>
                    <Text style={styles.sidebarChatTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.sidebarLast} numberOfLines={1}>
                    {last?.text || "لا توجد رسائل"}
                  </Text>
                </View>

                {unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ✅ CHAT AREA - منطقة المحادثة */}
      {loading ? (
        <View style={styles.chatAreaLoading}>
          <ActivityIndicator size="large" color="#1a3a2a" />
        </View>
      ) : selectedItem ? (
        <View style={styles.chatArea}>
          {/* CHAT HEADER */}
          <View style={styles.chatAreaHeader}>
            <View>
              <Text style={styles.chatAreaTitle}>{selectedItem?.title}</Text>
              <Text style={styles.chatAreaSubtitle}>
                {participants.length} مشارك
              </Text>
            </View>
          </View>

          {/* ✅ MESSAGES - قائمة الرسائل */}
          <FlatList
            ref={flatListRef}
            data={[...(messagesMap[selectedItem?.id] || [])].sort((a, b) => {
              const aTime = a.createdAt?.toDate
                ? a.createdAt.toDate().getTime()
                : 0;
              const bTime = b.createdAt?.toDate
                ? b.createdAt.toDate().getTime()
                : 0;

              return aTime - bTime;
            })}
            keyExtractor={(i) => i.id}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.uid;
              // ✅ تجميع الرياكشن
              const reactionsGroup = getReactionsGroup(item.reactions);
              const hasReactions = Object.keys(reactionsGroup).length > 0;

              return (
                <View style={styles.messageRow}>
                  {!isMe && (
                    <Image
                      source={{
                        uri: item.senderPhoto || "https://via.placeholder.com/40",
                      }}
                      style={styles.messageAvatar}
                    />
                  )}

                  <View
                    style={[
                      styles.messageContainer,
                      isMe && styles.messageContainerRight,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.messageSender}>
                        {item.senderName}
                      </Text>
                    )}

                    {/* ✅ REPLY TO - الرد على رسالة */}
                    {item.replyTo && (
                      <View
                        style={[
                          styles.replyQuote,
                          isMe && styles.replyQuoteMe,
                        ]}
                      >
                        <Text
                          style={[
                            styles.replyName,
                            isMe && styles.replyNameMe,
                          ]}
                        >
                          {item.replyTo.senderName}
                        </Text>
                        <Text
                          style={[
                            styles.replyText,
                            isMe && styles.replyTextMe,
                          ]}
                          numberOfLines={1}
                        >
                          {item.replyTo.text}
                        </Text>
                      </View>
                    )}

                    {/* ✅ MESSAGE BUBBLE - فقاعة الرسالة */}
                    <TouchableOpacity
                      onLongPress={() => setShowReactionPicker(item.id)}
                      style={[
                        styles.messageBubble,
                        isMe && styles.messageBubbleMe,
                      ]}
                    >
                      {/* MEDIA */}
                      {item.mediaType === "image" && item.mediaUrl && (
                        <Image
                          source={{ uri: item.mediaUrl }}
                          style={styles.mediaImage}
                        />
                      )}

                      {item.mediaType === "video" && item.mediaUrl && (
                        <View style={styles.videoPlaceholder}>
                          <Text style={{ color: "white", fontSize: 36 }}>
                            ▶️
                          </Text>
                        </View>
                      )}

                      {!item.mediaType && (
                        <Text
                          style={[
                            styles.messageText,
                            isMe && styles.messageTextMe,
                          ]}
                        >
                          {item.text}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* ✅ REACTIONS - عرض الرياكشن على الرسالة */}
                    {hasReactions && (
                      <View style={styles.reactionsContainer}>
                        {Object.entries(reactionsGroup).map(
                          ([emoji, users]: any) => {
                            // ✅ إنشاء مفتاح فريد للرياكشن
                            const reactionKey = `${emoji}_${users[0]}`;
                            // ✅ الحصول على الردود على هذا الرياكشن
                            const reactionsOnReaction =
                              getReactionsOnReactionGroup(
                                item.reactionReactions,
                                reactionKey
                              );
                            const hasReactionsOnReaction =
                              Object.keys(reactionsOnReaction).length > 0;

                            return (
                              <View key={emoji} style={styles.reactionWrapper}>
                                {/* ✅ Main Reaction Bubble */}
                                <TouchableOpacity
                                  onLongPress={() => {
                                    // ✅ اضغط طويل على الرياكشن لإضافة رد
                                    setReplyingToReaction(reactionKey);
                                    setShowReplyReactionPicker(item.id);
                                  }}
                                  style={styles.reactionBubble}
                                >
                                  <Text style={styles.reactionEmoji}>
                                    {emoji}
                                  </Text>
                                  <Text style={styles.reactionCount}>
                                    {users.length}
                                  </Text>
                                </TouchableOpacity>

                                {/* ✅ REACTIONS ON REACTION - عرض الردود على الرياكشن */}
                                {hasReactionsOnReaction && (
                                  <View style={styles.miniReactionsContainer}>
                                    {Object.entries(reactionsOnReaction).map(
                                      ([miniEmoji, miniUsers]: any) => (
                                        <View
                                          key={miniEmoji}
                                          style={styles.miniReactionBubble}
                                        >
                                          <Text style={styles.miniReactionEmoji}>
                                            {miniEmoji}
                                          </Text>
                                          {miniUsers.length > 1 && (
                                            <Text
                                              style={styles.miniReactionCount}
                                            >
                                              {miniUsers.length}
                                            </Text>
                                          )}
                                        </View>
                                      )
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          }
                        )}
                      </View>
                    )}

                    {/* MESSAGE FOOTER */}
                    <View
                      style={[
                        styles.messageFooter,
                        isMe && styles.messageFooterRight,
                      ]}
                    >
                      <Text style={styles.messageTime}>
                        {formatTime(item.createdAt)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setReplyingTo(item)}
                        style={styles.replyBtn}
                      >
                        <Text style={styles.replyBtnText}>↩️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isMe && (
                    <Image
                      source={{
                        uri: user?.photoURL || "https://via.placeholder.com/40",
                      }}
                      style={styles.messageAvatar}
                    />
                  )}
                </View>
              );
            }}
          />

          {/* ✅ REPLY INDICATOR */}
          {replyingTo && (
            <View style={styles.replyingIndicator}>
              <View style={{ flex: 1 }}>
                <Text style={styles.replyingLabel}>
                  رد على: {replyingTo.senderName}
                </Text>
                <Text numberOfLines={1} style={styles.replyingText}>
                  {replyingTo.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                style={styles.replyingCloseBtn}
              >
                <Text>✖</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ✅ INPUT AREA - منطقة الكتابة */}
          <View style={styles.inputArea}>
            <TouchableOpacity
              onPress={pickImage}
              style={[styles.iconBtn, uploading && styles.disabledBtn]}
              disabled={uploading}
            >
              <Text>🖼️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickVideo}
              style={[styles.iconBtn, uploading && styles.disabledBtn]}
              disabled={uploading}
            >
              <Text>🎬</Text>
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              style={styles.messageInput}
              placeholder="اكتب رسالة..."
              placeholderTextColor="#999"
              editable={!uploading}
              multiline
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendBtn,
                (uploading || !text.trim()) && styles.disabledBtn,
              ]}
              disabled={uploading || !text.trim()}
            >
              <Text style={styles.sendBtnText}>
                {uploading ? `${uploadProgress}%` : "📤"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.chatAreaEmpty}>
          <Text style={styles.emptyText}>اختر محادثة للبدء</Text>
        </View>
      )}

      {/* ✅ REACTION PICKER - ON MESSAGE */}
      {showReactionPicker && (
        <View style={styles.reactionPickerOverlay}>
          <TouchableOpacity
            style={styles.reactionPickerBackdrop}
            onPress={() => setShowReactionPicker(null)}
          />
          <View style={styles.reactionPicker}>
            {reactionEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => addReaction(emoji, showReactionPicker)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiBtnText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ✅ REACTION PICKER - ON REACTION */}
      {showReplyReactionPicker && (
        <View style={styles.reactionPickerOverlay}>
          <TouchableOpacity
            style={styles.reactionPickerBackdrop}
            onPress={() => {
              setShowReplyReactionPicker(null);
              setReplyingToReaction(null);
            }}
          />
          <View style={styles.reactionPicker}>
            {reactionEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() =>
                  addReactionOnReaction(
                    emoji,
                    replyingToReaction,
                    showReplyReactionPicker
                  )
                }
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiBtnText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },

  // SIDEBAR
  sidebar: {
    width: width * 0.28,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    display: "flex",
    flexDirection: "column",
  },

  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
  },

  sidebarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a3a2a",
  },

  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  searchInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: "#333",
    textAlign: "right",
  },

  filterBtn: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1a3a2a",
    borderRadius: 6,
    alignSelf: "flex-end",
  },

  filterBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  sidebarChatItem: {
    flexDirection: "row-reverse",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
  },

  sidebarChatItemSelected: {
    backgroundColor: "#e8f4f8",
    borderRightWidth: 3,
    borderRightColor: "#1a3a2a",
  },

  sidebarImg: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },

  sidebarChatHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  sidebarChatTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },

  sidebarTime: {
    fontSize: 11,
    color: "#999",
  },

  sidebarLast: {
    fontSize: 12,
    color: "#666",
  },

  unreadBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  unreadText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },

  // CHAT AREA
  chatArea: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },

  chatAreaLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  chatAreaEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: "#999",
  },

  chatAreaHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  chatAreaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a3a2a",
  },

  chatAreaSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },

  // MESSAGES
  messageRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-end",
    gap: 12,
  },

  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  messageContainer: {
    maxWidth: "70%",
    alignItems: "flex-start",
  },

  messageContainerRight: {
    alignItems: "flex-end",
  },

  messageSender: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },

  messageBubble: {
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },

  messageBubbleMe: {
    backgroundColor: "#1a3a2a",
  },

  messageText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
  },

  messageTextMe: {
    color: "#ffffff",
  },

  mediaImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },

  videoPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: "#555",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  replyQuote: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#1a3a2a",
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 6,
    borderRadius: 4,
  },

  replyQuoteMe: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderLeftColor: "white",
  },

  replyName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
  },

  replyNameMe: {
    color: "#ddd",
  },

  replyText: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },

  replyTextMe: {
    color: "#ccc",
  },

  messageFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  messageFooterRight: {
    flexDirection: "row",
  },

  messageTime: {
    fontSize: 10,
    color: "#999",
  },

  replyBtn: {
    padding: 4,
  },

  replyBtnText: {
    fontSize: 12,
  },

  // ✅ REACTIONS
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },

  reactionWrapper: {
    position: "relative",
  },

  reactionBubble: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reactionEmoji: {
    fontSize: 14,
  },

  reactionCount: {
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
  },

  // ✅ REACTIONS ON REACTION
  miniReactionsContainer: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },

  miniReactionBubble: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "#ffc107",
  },

  miniReactionEmoji: {
    fontSize: 10,
  },

  miniReactionCount: {
    fontSize: 8,
    color: "#666",
    fontWeight: "bold",
  },

  // REPLY INDICATOR
  replyingIndicator: {
    backgroundColor: "#e8f4f8",
    padding: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 12,
  },

  replyingLabel: {
    fontWeight: "bold",
    color: "#1a3a2a",
    fontSize: 11,
  },

  replyingText: {
    color: "#666",
    marginTop: 2,
    fontSize: 11,
  },

  replyingCloseBtn: {
    padding: 6,
  },

  // INPUT AREA
  inputArea: {
    flexDirection: "row-reverse",
    padding: 12,
    gap: 8,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
  },

  iconBtn: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  messageInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 100,
    textAlignVertical: "top",
  },

  sendBtn: {
    backgroundColor: "#1a3a2a",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 45,
  },

  sendBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },

  disabledBtn: {
    opacity: 0.6,
  },

  // REACTION PICKER
  reactionPickerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  reactionPickerBackdrop: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  reactionPicker: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    zIndex: 1000,
  },

  emojiBtn: {
    padding: 8,
  },

  emojiBtnText: {
    fontSize: 24,
  },
});