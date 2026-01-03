// src/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles } from 'lucide-react-native';

const chatBg = require('../../assets/images/chat_bg.png');

import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { 
  ensureChat, 
  appendMessage, 
  setTitleFromAssistant, 
  loadChat, 
  isWithin24HoursOfSignup, 
  Msg 
} from '../hooks/useChats';
import { tarotReply } from '../lib/openai';
import { startPurchaseFlow } from '../lib/subscriptions';

import Input from '../components/ui/input';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Animation Wrapper for Individual Messages ---
const FadeInView: React.FC<{ children: React.ReactNode; isUser: boolean }> = ({ children, isUser }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={{ 
        opacity: fadeAnim, 
        transform: [{ translateY: slideAnim }],
        flexDirection: 'row', 
        justifyContent: isUser ? 'flex-end' : 'flex-start', 
        marginBottom: 12 
      }}
    >
      {children}
    </Animated.View>
  );
};

type Props = { route?: any };

const ChatScreen: React.FC<Props> = ({ route }) => {
  const { user } = useAuth();
  const { canChat, refresh } = useSub();
  const insets = useSafeAreaInsets();
  
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [within24Hours, setWithin24Hours] = useState(true);
  const [loading, setLoading] = useState(false);

  const scroller = useRef<ScrollView>(null);

  // --- Effects ---

  useEffect(() => {
    if (!user) return;
    const paramId = route?.params?.chatId;
    
    ensureChat(user.uid, paramId).then(id => setChatId(id));
    isWithin24HoursOfSignup(user.uid).then(within => setWithin24Hours(within));
  }, [user?.uid, route?.params?.chatId]);

  useEffect(() => {
    if (!user || !chatId) return;
    loadChat(user.uid, chatId).then((chat) => {
      if (chat?.messages) {
        // Use LayoutAnimation when bulk loading messages for a smooth entrance
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessages(chat.messages);
      }
    });
  }, [user?.uid, chatId]);

  const scrollToEnd = () => {
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 150);
  };

  // --- Handlers ---

  const onSend = async () => {
    const text = input.trim();
    if (!text || !user || !chatId || loading) return;

    // Trigger smooth layout shift
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      await appendMessage(user.uid, chatId, messages, userMsg);
      const updatedAfterUser = [...messages, userMsg];
      
      const replyText = await tarotReply(updatedAfterUser);
      const botMsg: Msg = { role: 'assistant', content: replyText, ts: Date.now() };

      // Animate the Oracle's response appearing
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setMessages(prev => [...prev, botMsg]);
      
      await appendMessage(user.uid, chatId, updatedAfterUser, botMsg);
      await setTitleFromAssistant(user.uid, chatId, replyText);
      scrollToEnd();
    } catch (error) {
      const errorMsg: Msg = { role: 'assistant', content: 'The stars are clouded. Please try again.', ts: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    try {
      await startPurchaseFlow(user.uid);
      await refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const renderInputBar = () => {
    const shouldShowSubscribe = !canChat && !within24Hours;
    if (shouldShowSubscribe) {
      return (
        <View style={{ padding: 16, paddingBottom: 16 + insets.bottom, alignItems: 'center', backgroundColor: '#000' }}>
          <TouchableOpacity onPress={handleSubscribe} style={{ backgroundColor: '#581c87', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 2, borderColor: '#a855f7', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles color="#e9d5ff" size={20} fill="#e9d5ff" />
            <Text style={{ color: '#e9d5ff', fontSize: 18, fontWeight: '700' }}>Subscribe 🔮</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="Ask the Oracle..."
          placeholderTextColor="#64748b"
          onSubmitEditing={onSend}
          editable={!loading}
          style={{ flex: 1, backgroundColor: '#1e293b', color: '#fff', borderRadius: 12 }}
        />
        <TouchableOpacity 
          onPress={onSend} 
          disabled={loading || !input.trim()}
          style={{ height: 48, width: 48, borderRadius: 12, backgroundColor: loading || !input.trim() ? '#334155' : '#1e3a8a', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageBackground source={chatBg} style={{ flex: 1 }} imageStyle={{ opacity: 0.15 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            ref={scroller} 
            contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <FadeInView isUser={false}>
                <View style={{ backgroundColor: 'rgba(30, 58, 138, 0.2)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: '#3b82f6' }}>
                  <Text style={{ color: '#93c5fd', textAlign: 'center', fontSize: 16 }}>
                    Blessings upon your journey 🌙{"\n"}What secrets shall we uncover?
                  </Text>
                </View>
              </FadeInView>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <FadeInView key={m.ts || i} isUser={isUser}>
                  <View style={{
                    maxWidth: '85%',
                    backgroundColor: isUser ? '#1e3a8a' : 'rgba(15, 23, 42, 0.95)',
                    padding: 14,
                    borderRadius: 18,
                    borderWidth: isUser ? 0 : 1,
                    borderColor: '#facc15',
                    elevation: isUser ? 0 : 5,
                    shadowColor: '#facc15',
                    shadowOpacity: isUser ? 0 : 0.2,
                    shadowRadius: 8,
                  }}>
                    <Text style={{ 
                      color: isUser ? '#fff' : '#fde68a', 
                      fontSize: 16, 
                      lineHeight: 24,
                      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' 
                    }}>
                      {m.content}
                    </Text>
                  </View>
                </FadeInView>
              );
            })}

            {loading && (
              <FadeInView isUser={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 12 }}>
                  <ActivityIndicator size="small" color="#facc15" />
                  <Text style={{ color: '#facc15', fontStyle: 'italic' }}>Consulting the cards...</Text>
                </View>
              </FadeInView>
            )}
          </ScrollView>
          {renderInputBar()}
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default ChatScreen;
