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
} from 'react-native';
import { Send } from 'lucide-react-native';
import chatBg from '../../assets/images/chat_bg.png';

import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { ensureThread, appendMessage, setTitleFromAssistant, Msg } from '../hooks/useChats';
import { tarotReply } from '../lib/openai';

import Input from '../components/ui/input';
import Button from '../components/ui/button';

type Props = { route?: any };
const ChatScreen: React.FC<Props> = ({ route }) => {
  const { user } = useAuth();
  const { canChat } = useSub();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [freeUsed, setFreeUsed] = useState(false);

  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) return;
    const paramId = route?.params?.chatId as string | undefined;
    ensureThread(user.uid, paramId).then(id => setChatId(id));
  }, [user?.uid]);

  const scrollToEnd = () => scroller.current?.scrollToEnd({ animated: true });

  const onSend = async () => {
    const text = input.trim();
    if (!text || !user || !chatId) return;
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    await appendMessage(user.uid, chatId, userMsg);
    scrollToEnd();

    // Get oracle reply (mock or real)
    const replyText = await tarotReply([...messages, userMsg]);
    const botMsg: Msg = { role: 'assistant', content: replyText, ts: Date.now() };
    setMessages(prev => [...prev, botMsg]);
    await appendMessage(user.uid, chatId, botMsg);
    await setTitleFromAssistant(user.uid, chatId, replyText);
    setFreeUsed(true);
    scrollToEnd();
  };

  const renderInputBar = () => {
    // If user can't chat OR already had first assistant reply → show Subscribe CTA
    if (!canChat || freeUsed) {
      return (
        <View style={{ padding: 12, alignItems: 'center', backgroundColor: '#000' }}>
          <Button className="rounded-2xl px-6 py-3 text-lg font-medium shadow-md">
            Subscribe 🔮
          </Button>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#000' }}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="What can I help you to navigate?"
          onSubmitEditing={onSend}
          style={{ flex: 1 }}
        />
        <TouchableOpacity
          onPress={onSend}
          style={{ height: 48, width: 48, borderRadius: 12, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Send"
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ImageBackground source={chatBg} style={{ flex: 1 }} imageStyle={{ opacity: 0.2 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {/* Empty-state hero */}
            {messages.length === 0 && (
              <View style={{ opacity: 0.9, marginBottom: 16 }}>
                <Text style={{ color: '#9cc1ff', textAlign: 'center' }}>
                  Blessings upon your journey 🌙 — What would you like insight on today?
                </Text>
              </View>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  <View
                    style={{
                      maxWidth: '80%',
                      backgroundColor: isUser ? '#1e3a8a' : '#0d1423',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                    }}
                  >
                    <Text style={{ color: isUser ? '#ffffff' : '#c2dbff' }}>{m.content}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Input or Subscribe */}
          {renderInputBar()}
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default ChatScreen;
