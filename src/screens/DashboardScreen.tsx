// src/screens/DashboardScreen.tsx
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronRight, UserRound } from "lucide-react-native";

import { useAuth } from "../context/AuthProvider";
import { useSub } from "../context/SubscriptionProvider";
import { listChats, Chat, deleteChat } from "../hooks/useChats";
import AdBanner from "../lib/admob";
import CosmicBackground from "../components/magic/CosmicBackground";
import GlassPanel from "../components/magic/GlassPanel";
import GlowButton from "../components/magic/GlowButton";
import PressableScale from "../components/magic/PressableScale";
import TarotCard, { FloatingCard } from "../components/magic/TarotCard";
import AccountSheet from "../components/AccountSheet";
import PaywallSheet from "../components/PaywallSheet";
import PlanPill from "../components/PlanPill";
import { colors, fonts, radii, type } from "../theme";

const dashboardBg = require("../../assets/images/dashboard_bg.png");

// Helper function to group chats by date
function groupByDate(chats: Chat[]): Record<string, Chat[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Chat[]> = { Today: [], Yesterday: [], Older: [] };

  chats.forEach((chat) => {
    const chatDate = toDate(chat.createdAt);
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (chatDay.getTime() === todayDay.getTime()) {
      groups.Today.push(chat);
    } else if (chatDay.getTime() === yesterdayDay.getTime()) {
      groups.Yesterday.push(chat);
    } else {
      groups.Older.push(chat);
    }
  });

  return groups;
}

// Firestore timestamps arrive as Timestamp objects; mock chats use Dates.
function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value ?? Date.now());
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 18) return "Good evening";
  if (h < 12) return "Good morning";
  return "Good afternoon";
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, signOutAsync } = useAuth();
  const { canChat } = useSub();

  const [chatGroups, setChatGroups] = useState<Record<string, Chat[]>>({
    Today: [],
    Yesterday: [],
    Older: [],
  });
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const items = await listChats(user.uid);
      setChatGroups(groupByDate(items));
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Reload whenever the dashboard comes back into view, so new readings show up.
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  const handleNewChat = () => {
    // Always allow creating new chats
    // ChatScreen will handle showing the paywall after the free message is used
    navigation.navigate("Chat");
  };

  const handleOpenChat = (chatId: string) => {
    navigation.navigate("Chat", { chatId });
  };

  const handleDeleteChat = (chat: Chat) => {
    if (!user) return;
    Alert.alert("Delete reading", `Are you sure you want to delete "${chat.title || "New Reading"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChat(user.uid, chat.id);
            await loadChats();
          } catch (error) {
            console.error("Error deleting chat:", error);
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    try {
      await signOutAsync();
      // Tells Login to ignore the briefly-stale signed-in user instead of bouncing back here.
      navigation.replace("Login", { fromLogout: true });
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  const formatTime = (date: any) =>
    toDate(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const hasChats = Object.values(chatGroups).some((arr) => arr.length > 0);
  let rowIndex = 0;

  return (
    <CosmicBackground image={dashboardBg} imageOpacity={0.22}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <Animated.View entering={FadeInDown.duration(700)} style={styles.header}>
          <Text style={[type.title, { flex: 1 }]}>{greeting()}</Text>
          <PlanPill onPress={() => setPaywallOpen(true)} />
          <PressableScale onPress={() => setAccountOpen(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Account">
            <UserRound size={18} color={colors.textMuted} />
          </PressableScale>
        </Animated.View>

        {/* Card fan hero */}
        <Animated.View entering={FadeInDown.delay(150).duration(900)} style={styles.hero}>
          <PressableScale onPress={handleNewChat} scaleTo={0.97} accessibilityRole="button" accessibilityLabel="Draw cards">
            <View style={styles.fan}>
              <FloatingCard width={92} face="moon" hideLabel tilt={-14} delay={300} style={[styles.fanCard, { left: 18, top: 26 }]} />
              <FloatingCard width={92} face="star" hideLabel tilt={14} delay={700} style={[styles.fanCard, { right: 18, top: 26 }]} />
              <FloatingCard width={116} face="sun" amplitude={10} style={styles.fanCenter} />
            </View>
          </PressableScale>
          <Text style={[type.heading, styles.heroTitle]}>What's on your mind?</Text>
          <View style={styles.heroButton}>
            <GlowButton label="New reading" onPress={handleNewChat} />
          </View>
        </Animated.View>

        {!canChat && (
          <Animated.View entering={FadeInDown.delay(300).duration(800)}>
            <PressableScale onPress={() => setPaywallOpen(true)} scaleTo={0.98}>
              <GlassPanel tone="gold" style={styles.upsell}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.upsellTitle}>Unlimited readings</Text>
                  <Text style={type.caption}>$3 for 24 hours, or $30 a month.</Text>
                </View>
                <ChevronRight size={20} color={colors.gold} />
              </GlassPanel>
            </PressableScale>
          </Animated.View>
        )}

        {/* Chat list */}
        <Text style={[type.heading, styles.sectionLabel]}>Past readings</Text>
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : !hasChats ? (
          <Animated.View entering={FadeInDown.duration(700)} style={styles.empty}>
            <Text style={styles.emptyText}>No readings yet. Start one above.</Text>
          </Animated.View>
        ) : (
          Object.entries(chatGroups).map(([dateLabel, items]) =>
            items.length > 0 ? (
              <View key={dateLabel} style={{ marginBottom: 18 }}>
                <Text style={styles.groupLabel}>{dateLabel}</Text>
                {items.map((chat) => (
                  <Animated.View key={chat.id} entering={FadeInDown.delay(Math.min(rowIndex++, 8) * 60).duration(500)}>
                    <PressableScale
                      onPress={() => handleOpenChat(chat.id)}
                      onLongPress={() => handleDeleteChat(chat)}
                      delayLongPress={500}
                      scaleTo={0.98}
                      accessibilityRole="button"
                      accessibilityHint="Long press to delete"
                    >
                      <GlassPanel style={styles.row}>
                        <TarotCard width={24} face="back" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {chat.title || "New Reading"}
                          </Text>
                          {chat.updatedAt && <Text style={type.caption}>{formatTime(chat.updatedAt)}</Text>}
                        </View>
                        <ChevronRight size={18} color={colors.textFaint} />
                      </GlassPanel>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            ) : null
          )
        )}
      </ScrollView>

      {/* AdMob Banner at bottom */}
      <View style={{ position: "absolute", bottom: insets.bottom, left: 0, right: 0 }}>
        <AdBanner />
      </View>

      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <AccountSheet
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onLogout={handleLogout}
        onDeleted={() => {
          setAccountOpen(false);
          navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
        }}
      />
    </CosmicBackground>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, width: "100%", maxWidth: 560, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  hero: { alignItems: "center", gap: 18, marginTop: 8, marginBottom: 22 },
  fan: { width: 280, height: 220, alignItems: "center" },
  fanCard: { position: "absolute", opacity: 0.85 },
  fanCenter: { position: "absolute", top: 10 },
  heroTitle: { alignSelf: "stretch" },
  heroButton: { alignSelf: "stretch" },
  upsell: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 18, marginBottom: 24 },
  upsellTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.goldBright },
  sectionLabel: { marginBottom: 12 },
  groupLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textMuted, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    marginBottom: 10,
  },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.parchment },
  empty: { paddingVertical: 12 },
  emptyText: { fontFamily: fonts.body, fontSize: 17, color: colors.textMuted },
});
