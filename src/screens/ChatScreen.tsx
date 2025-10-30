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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles } from 'lucide-react-native';
const chatBg = require('../../assets/images/chat_bg.png');

import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { ensureChat, appendMessage, setTitleFromAssistant, loadChat, isWithin24HoursOfSignup, Msg } from '../hooks/useChats';
import { tarotReply } from '../lib/openai';
import { startPurchaseFlow } from '../lib/subscriptions';

import Input from '../components/ui/input';
import Button from '../components/ui/button';

type Props = { route?: any };
const ChatScreen: React.FC<Props> = ({ route }) => {
  const { user } = useAuth();
  const { canChat, refresh } = useSub();
  const insets = useSafeAreaInsets();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [within24Hours, setWithin24Hours] = useState(true); // Default to true (allow chat)
  const [loading, setLoading] = useState(false);

  const scroller = useRef<ScrollView>(null);

  // Log when canChat changes
  useEffect(() => {
    console.log('ChatScreen: canChat changed to:', canChat);
  }, [canChat]);

  useEffect(() => {
    if (!user) {
      console.log('ChatScreen: No user yet');
      return;
    }
    
    const paramId = route?.params?.chatId as string | undefined;
    console.log('ChatScreen: Ensuring chat, paramId:', paramId, 'userId:', user.uid);
    
    ensureChat(user.uid, paramId)
      .then((id: string) => {
        console.log('ChatScreen: Chat ID received:', id);
        setChatId(id);
      })
      .catch((error) => {
        console.error('ChatScreen: Error ensuring chat:', error);
        // Create a fallback chat ID if ensureChat fails
        const fallbackId = `chat-${Date.now()}`;
        console.log('ChatScreen: Using fallback chat ID:', fallbackId);
        setChatId(fallbackId);
      });
  }, [user?.uid, route?.params?.chatId]);

  // Check if user is within 24 hours of signup when user loads
  useEffect(() => {
    if (!user) return;
    
    console.log('ChatScreen: Checking 24-hour window for user:', user.uid);
    isWithin24HoursOfSignup(user.uid)
      .then((within) => {
        console.log('ChatScreen: User is within 24 hours of signup:', within);
        setWithin24Hours(within);
      })
      .catch((error) => {
        console.error('ChatScreen: Error checking 24-hour window:', error);
      });
  }, [user?.uid]);

  // Load existing chat messages when chatId is set
  useEffect(() => {
    if (!user || !chatId) return;
    
    console.log('ChatScreen: Loading messages for chatId:', chatId);
    loadChat(user.uid, chatId)
      .then((chat) => {
        if (chat && chat.messages && chat.messages.length > 0) {
          console.log('ChatScreen: Loaded', chat.messages.length, 'messages');
          setMessages(chat.messages);
        } else {
          console.log('ChatScreen: No messages found in chat');
        }
      })
      .catch((error) => {
        console.error('ChatScreen: Error loading chat:', error);
      });
  }, [user?.uid, chatId]);

  const scrollToEnd = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 100);

  const onSend = async () => {
    const text = input.trim();
    console.log('=== onSend START ===');
    console.log('onSend: text:', text, 'user:', !!user, 'chatId:', chatId, 'loading:', loading);
    
    if (!text || !user || !chatId || loading) {
      console.log('onSend: early return - missing requirements');
      return;
    }
    
    console.log('onSend: Setting loading to true');
    setLoading(true);
    
    console.log('onSend: Creating user message');
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    console.log('onSend: Appending user message to Firestore');
    try {
      await appendMessage(user.uid, chatId, messages, userMsg);
      console.log('onSend: User message appended successfully');
    } catch (error) {
      console.error('onSend: Error appending user message:', error);
    }
    
    const updatedAfterUser = [...messages, userMsg];
    scrollToEnd();

    try {
      // Get oracle reply (mock or real)
      console.log('onSend: Calling tarotReply with', updatedAfterUser.length, 'messages...');
      const startTime = Date.now();
      
      const replyText = await tarotReply(updatedAfterUser);
      
      const elapsed = Date.now() - startTime;
      console.log('onSend: Got reply in', elapsed, 'ms');
      console.log('onSend: Reply text:', replyText?.substring(0, 100) + '...');
      
      const botMsg: Msg = { role: 'assistant', content: replyText, ts: Date.now() };
      console.log('onSend: Adding bot message to UI');
      setMessages(prev => [...prev, botMsg]);
      
      console.log('onSend: Appending bot message to Firestore');
      await appendMessage(user.uid, chatId, updatedAfterUser, botMsg);
      console.log('onSend: Bot message appended successfully');
      
      console.log('onSend: Setting title from assistant message');
      await setTitleFromAssistant(user.uid, chatId, replyText);
      console.log('onSend: Title set successfully');
      
      // No need to mark anything - 24-hour window is time-based
      
      scrollToEnd();
      console.log('=== onSend SUCCESS ===');
    } catch (error) {
      console.error('=== onSend ERROR ===');
      console.error('Error getting tarot reading:', error);
      const errorMsg: Msg = { role: 'assistant', content: 'The spirits are unclear at the moment. Please try again.', ts: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      console.log('onSend: Setting loading to false');
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    console.log('=== ChatScreen handleSubscribe START ===');
    console.log('handleSubscribe: user exists:', !!user);
    console.log('handleSubscribe: current canChat:', canChat, 'within24Hours:', within24Hours);
    
    if (!user) {
      console.log('handleSubscribe: No user, aborting');
      return;
    }
    
    try {
      console.log('handleSubscribe: Calling startPurchaseFlow...');
      await startPurchaseFlow(user.uid);
      console.log('handleSubscribe: Purchase flow completed');
      
      console.log('handleSubscribe: Calling refresh...');
      await refresh();
      console.log('handleSubscribe: Subscription refreshed');
      console.log('handleSubscribe: canChat is now:', canChat);
      console.log('=== ChatScreen handleSubscribe SUCCESS ===');
    } catch (error) {
      console.error('=== ChatScreen handleSubscribe ERROR ===');
      console.error('Error in handleSubscribe:', error);
      Alert.alert('Subscription Error', 'There was an issue starting the subscription process. Please try again or contact support.');
    }
  };

  const renderInputBar = () => {
    // Show Subscribe button if: user is not subscribed AND is outside 24-hour window
    // Show input if: user is subscribed OR is within 24-hour window
    const shouldShowSubscribe = !canChat && !within24Hours;
    
    console.log('renderInputBar: canChat =', canChat, 'within24Hours =', within24Hours, 'shouldShowSubscribe =', shouldShowSubscribe);
    
    if (shouldShowSubscribe) {
      return (
        <View style={{ 
          padding: 16, 
          paddingBottom: 16 + insets.bottom, // Add safe area padding for navigation bar
          alignItems: 'center', 
          backgroundColor: 'rgba(0, 0, 0, 0.9)' 
        }}>
          <TouchableOpacity
            onPress={handleSubscribe}
            style={{
              backgroundColor: '#581c87',
              borderRadius: 24,
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderWidth: 2,
              borderColor: '#a855f7',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles color="#e9d5ff" size={20} fill="#e9d5ff" />
            <Text style={{ color: '#e9d5ff', fontSize: 18, fontWeight: '700' }}>
              Subscribe 🔮
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
            Unlock unlimited readings
          </Text>
        </View>
      );
    }

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        padding: 12, 
        paddingBottom: 12 + insets.bottom, // Add safe area padding for navigation bar
        backgroundColor: 'rgba(0, 0, 0, 0.9)' 
      }}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="What can I help you to navigate?"
          placeholderTextColor="#64748b"
          onSubmitEditing={onSend}
          editable={!loading}
          style={{ 
            flex: 1, 
            backgroundColor: '#1e293b',
            borderColor: '#475569',
            color: '#e2e8f0',
          }}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={loading || !input.trim()}
          style={{ 
            height: 48, 
            width: 48, 
            borderRadius: 12, 
            backgroundColor: loading || !input.trim() ? '#334155' : '#1e3a8a', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
          aria-label="Send"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageBackground source={chatBg} style={{ flex: 1 }} imageStyle={{ opacity: 0.15 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <ScrollView 
              ref={scroller} 
              contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Empty-state hero */}
              {messages.length === 0 && (
                <View style={{ 
                  backgroundColor: 'rgba(30, 58, 138, 0.3)',
                  borderRadius: 16,
                  padding: 20,
                  marginVertical: 40,
                  borderWidth: 1,
                  borderColor: '#3b82f6',
                }}>
                  <Text style={{ 
                    color: '#93c5fd', 
                    textAlign: 'center',
                    fontSize: 16,
                    lineHeight: 24,
                  }}>
                    Blessings upon your journey 🌙{'\n\n'}
                    What would you like insight on today?
                  </Text>
                </View>
              )}

              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <View 
                    key={i} 
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: isUser ? 'flex-end' : 'flex-start', 
                      marginBottom: 12 
                    }}
                  >
                    <View
                      style={{
                        maxWidth: '80%',
                        backgroundColor: isUser ? '#1e3a8a' : 'rgba(13, 20, 35, 0.9)',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 16,
                        borderWidth: isUser ? 0 : 1,
                        borderColor: isUser ? 'transparent' : '#facc15',
                      }}
                    >
                      <Text style={{ 
                        color: isUser ? '#ffffff' : '#fde68a',
                        fontSize: 15,
                        lineHeight: 22,
                      }}>
                        {m.content}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {loading && (
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'flex-start', 
                  marginBottom: 12 
                }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(13, 20, 35, 0.9)',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#facc15',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <ActivityIndicator size="small" color="#facc15" />
                    <Text style={{ color: '#fde68a', fontSize: 15 }}>
                      Consulting the cards...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input or Subscribe */}
            {renderInputBar()}
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default ChatScreen;
