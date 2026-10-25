// src/screens/ChatScreen.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ArrowUp, ChevronLeft } from 'lucide-react-native';
const chatBg = require('../../assets/images/chat_bg.png');

import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { ensureChat, appendMessage, setTitleFromAssistant, loadChat, hasUsedFreeTrial, markFreeTrialUsed, Msg } from '../hooks/useChats';
import { PaymentRequiredError, streamTarotReply } from '../lib/openai';
import { splitReading } from '../lib/reading';

import CosmicBackground from '../components/magic/CosmicBackground';
import GlassPanel from '../components/magic/GlassPanel';
import GlowButton from '../components/magic/GlowButton';
import OracleThinking from '../components/magic/OracleThinking';
import PressableScale from '../components/magic/PressableScale';
import { FloatingCard } from '../components/magic/TarotCard';
import PaywallSheet from '../components/PaywallSheet';
import PlanPill from '../components/PlanPill';
import { colors, fonts, glow, radii, type } from '../theme';

function Caret() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.15, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.caret, style]} />;
}

const OracleMessage = memo(({ content, streaming }: { content: string; streaming?: boolean }) => {
  const { card, body } = splitReading(content);
  return (
    <Animated.View entering={FadeInUp.duration(450)} style={styles.oracleRow}>
      <GlassPanel tone="gold" style={styles.oracleBubble}>
        {card && (
          <View style={styles.cardHead}>
            <Text style={styles.cardName}>{card}</Text>
            <View style={styles.cardRule} />
          </View>
        )}
        <Text style={styles.oracleText}>
          {body}
        </Text>
        {streaming && <Caret />}
      </GlassPanel>
    </Animated.View>
  );
});

const UserMessage = memo(({ content }: { content: string }) => (
  <Animated.View entering={FadeInUp.duration(350)} style={styles.userRow}>
    <View style={styles.userBubble}>
      <Text style={styles.userText}>{content}</Text>
    </View>
  </Animated.View>
));

type Props = { route?: any };
const ChatScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { canChat } = useSub();
  const insets = useSafeAreaInsets();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [freeUsed, setFreeUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  // Text of the reply as it streams in; null when no reply is in flight.
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stop streaming if the user leaves mid-reading.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!user) return;

    const paramId = route?.params?.chatId as string | undefined;
    ensureChat(user.uid, paramId)
      .then((id: string) => setChatId(id))
      .catch((error) => {
        console.error('ChatScreen: Error ensuring chat:', error);
        // Create a fallback chat ID if ensureChat fails
        setChatId(`chat-${Date.now()}`);
      });
  }, [user?.uid, route?.params?.chatId]);

  // Check global free trial status when user loads
  useEffect(() => {
    if (!user) return;
    hasUsedFreeTrial(user.uid)
      .then(setFreeUsed)
      .catch((error) => console.error('ChatScreen: Error checking free trial:', error));
  }, [user?.uid]);

  // Load existing chat messages when chatId is set
  useEffect(() => {
    if (!user || !chatId) return;
    loadChat(user.uid, chatId)
      .then((chat) => {
        if (chat?.messages?.length) setMessages(chat.messages);
      })
      .catch((error) => console.error('ChatScreen: Error loading chat:', error));
  }, [user?.uid, chatId]);

  const locked = !canChat && freeUsed;

  const sendMessage = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !user || !chatId || loading) return;
    if (locked) {
      setPaywallOpen(true);
      return;
    }

    setLoading(true);
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');

    // Save the question while the oracle answers; the reply is written after it lands.
    const savingUser = appendMessage(user.uid, chatId, messages, userMsg).catch((error) =>
      console.error('sendMessage: Error appending user message:', error)
    );

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setStreamingText('');
      const replyText = await streamTarotReply(history, {
        signal: controller.signal,
        onDelta: (_, full) => setStreamingText(full),
      });
      if (controller.signal.aborted) return;

      const botMsg: Msg = { role: 'assistant', content: replyText, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      setStreamingText(null);

      await savingUser;
      await appendMessage(user.uid, chatId, history, botMsg);
      await setTitleFromAssistant(user.uid, chatId, replyText);

      // Mark free trial as used globally (if not subscribed)
      if (!canChat && !freeUsed) {
        await markFreeTrialUsed(user.uid);
      }
      setFreeUsed(true);
    } catch (error) {
      setStreamingText(null);
      // The server is the source of truth: free reading used and no active plan.
      if (error instanceof PaymentRequiredError) {
        setFreeUsed(true);
        setPaywallOpen(true);
        return;
      }
      console.error('Error getting tarot reading:', error);
      const errorMsg: Msg = { role: 'assistant', content: "Something went wrong getting your reading. Please try again.", ts: Date.now() };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Dashboard'));
  const scrollToEnd = () => scroller.current?.scrollToEnd({ animated: true });

  const renderInputBar = () => {
    if (locked) {
      return (
        <Animated.View entering={FadeInDown.duration(500)} style={[styles.dock, { paddingBottom: 14 + insets.bottom }]}>
          <GlassPanel tone="gold" style={styles.lockPanel}>
            <Text style={type.heading}>That was your free reading</Text>
            <Text style={type.caption}>Get 24 hours for $3, or subscribe for $30 a month.</Text>
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <GlowButton label="See plans" onPress={() => setPaywallOpen(true)} />
            </View>
          </GlassPanel>
        </Animated.View>
      );
    }

    const canSend = !loading && !!input.trim();
    return (
      <View style={[styles.dock, { paddingBottom: 12 + insets.bottom }]}>
        <View style={[styles.composer, focused && styles.composerFocused]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.gold}
            onSubmitEditing={() => sendMessage()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!loading}
            returnKeyType="send"
            style={styles.composerInput}
          />
          <PressableScale
            onPress={() => sendMessage()}
            disabled={!canSend}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.send, canSend ? glow(colors.gold, 14, 0.6) : styles.sendIdle]}
          >
            <ArrowUp size={20} color={canSend ? colors.night : colors.textFaint} strokeWidth={2.5} />
          </PressableScale>
        </View>
      </View>
    );
  };

  return (
    <CosmicBackground image={chatBg} imageOpacity={0.28} density="calm">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <PressableScale onPress={goBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={22} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>Tarot Oracle</Text>
          <PlanPill onPress={() => setPaywallOpen(true)} />
        </View>

        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {/* Empty-state hero */}
          {messages.length === 0 && (
            <Animated.View entering={FadeIn.duration(900)} style={styles.emptyHero}>
              <FloatingCard width={84} face="back" amplitude={8} />
              <Text style={styles.emptyTitle}>What's your question?</Text>
              <Text style={type.caption}>
                Love, work, a decision, a feeling you can't shake. Ask it the way you'd say it out loud.
              </Text>
            </Animated.View>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage key={`${m.ts}-${i}`} content={m.content} />
            ) : (
              <OracleMessage key={`${m.ts}-${i}`} content={m.content} />
            )
          )}

          {streamingText ? <OracleMessage content={streamingText} streaming /> : null}
          {loading && !streamingText && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.oracleRow}>
              <OracleThinking />
            </Animated.View>
          )}
        </ScrollView>

        {/* Input or paywall */}
        {renderInputBar()}
      </KeyboardAvoidingView>

      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason={locked ? 'Your free reading is complete' : undefined}
      />
    </CosmicBackground>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    backgroundColor: 'rgba(4, 5, 12, 0.55)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 23, color: colors.parchment, textAlign: 'center' },
  thread: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
  emptyHero: { alignItems: 'flex-start', gap: 8, paddingTop: 32, paddingHorizontal: 6 },
  emptyTitle: { ...type.title, marginTop: 18 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: 'rgba(84, 106, 214, 0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(157, 183, 255, 0.35)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderBottomRightRadius: 6,
  },
  userText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: '#f4f5ff' },
  oracleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 16 },
  oracleBubble: { maxWidth: '92%', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, borderBottomLeftRadius: 6 },
  cardHead: { marginBottom: 10 },
  cardName: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.goldBright },
  cardRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairlineGold, marginTop: 10, width: 64 },
  oracleText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26, color: colors.text },
  caret: { width: 8, height: 16, borderRadius: 2, backgroundColor: colors.gold, marginTop: 4 },
  dock: { paddingHorizontal: 14, paddingTop: 10, width: '100%', maxWidth: 720, alignSelf: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  composerFocused: { borderColor: colors.hairlineGold, ...glow(colors.gold, 16, 0.3) },
  composerInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.text,
    paddingVertical: 10,
    outlineStyle: 'none',
  } as any,
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  sendIdle: { backgroundColor: 'rgba(255,255,255,0.06)' },
  lockPanel: { padding: 18, gap: 4 },
});
