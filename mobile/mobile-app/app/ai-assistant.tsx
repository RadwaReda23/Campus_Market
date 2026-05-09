import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { askCampusAssistant } from '../services/aiService';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

export default function AIAssistantScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'أهلاً بك! أنا المساعد الذكي لـ Campus Market 🤖\nإزاي أقدر أساعدك؟ (مثال: محتاج بالطو مقاس سمول، أو دورت على مفاتيحي الضايعة؟)',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Call AI Service
    const aiReply = await askCampusAssistant(userMessage.text);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiReply,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessageText = (text: string, isUser: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <Text 
            key={index} 
            style={{ color: isUser ? '#e0e0e0' : Colors.light.accent, textDecorationLine: 'underline', fontFamily: Fonts.cairoBold }}
            onPress={() => {
              const qMatch = part.match(/q=([^&]*)/);
              const searchQuery = qMatch && qMatch[1] ? decodeURIComponent(qMatch[1]) : "";
              router.push({ pathname: '/marketplace', params: { search: searchQuery } });
            }}
          >
            اضغط هنا لعرض المنتج
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {renderMessageText(item.text, isUser)}
        </Text>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المساعد الذكي 🤖</Text>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="اكتب رسالتك هنا..."
          value={inputText}
          onChangeText={setInputText}
          textAlign="right"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>إرسال</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 50,
    padding: 5,
  },
  backBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: Fonts.cairoBold,
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    borderBottomLeftRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: Fonts.cairo,
  },
  userText: {
    color: 'white',
    textAlign: 'left',
  },
  botText: {
    color: '#333',
    textAlign: 'right',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 5,
    fontFamily: Fonts.cairo,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-start',
  },
  botTimestamp: {
    color: '#999',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 45,
    maxHeight: 100,
    fontFamily: Fonts.cairo,
    fontSize: 14,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 45,
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  sendBtnText: {
    color: 'white',
    fontFamily: Fonts.cairoBold,
  },
});
