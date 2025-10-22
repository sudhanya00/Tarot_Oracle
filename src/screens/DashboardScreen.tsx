// src/screens/DashboardScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Star, Sun, Moon, MessageCircle, Clock, LogOut, Trash2 } from "lucide-react-native";

const dashboardBg = require("../../assets/images/dashboard_bg.png");
import Button from "../components/ui/button";
import Card, { CardContent } from "../components/ui/card";

import { useAuth } from "../context/AuthProvider";
import { useSub } from "../context/SubscriptionProvider";
import { startPurchaseFlow } from "../lib/subscriptions";
import { listChats, Chat, deleteChat } from "../hooks/useChats";
import AdBanner from "../lib/admob";

// Helper function to group chats by date
function groupByDate(chats: Chat[]): Record<string, Chat[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Chat[]> = { Today: [], Yesterday: [], Older: [] };

  chats.forEach((chat) => {
    const chatDate = chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt);
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

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, signOutAsync } = useAuth();
  const { canChat, refresh } = useSub();

  const [chatGroups, setChatGroups] = useState<Record<string, Chat[]>>({
    Today: [],
    Yesterday: [],
    Older: [],
  });
  const [loading, setLoading] = useState(true);

  const loadChats = async () => {
    if (!user) return;
    setLoading(true);
    const items = await listChats(user.uid);
    setChatGroups(groupByDate(items));
    setLoading(false);
  };

  useEffect(() => {
    loadChats();
  }, [user?.uid]);

  const handleNewChat = () => {
    // Always allow creating new chats
    // ChatScreen will handle showing subscribe button after free message is used
    navigation.navigate("Chat");
  };

  const handleOpenChat = (chatId: string) => {
    navigation.navigate("Chat", { chatId });
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log('handleDeleteChat called with chatId:', chatId);
    console.log('User exists:', !!user);
    
    if (!user) {
      console.log('No user, returning early');
      return;
    }
    
    // Get chat title for confirmation message - search through all groups
    let chat: Chat | undefined;
    for (const items of Object.values(chatGroups)) {
      chat = items.find((c: Chat) => c.id === chatId);
      if (chat) break;
    }
    const chatTitle = chat?.title || "New Reading";
    
    console.log('Found chat:', chat);
    console.log('Chat title:', chatTitle);
    console.log('About to show Alert...');
    
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete "${chatTitle}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log('Cancel pressed')
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('Delete confirmed, deleting chat:', chatId);
              await deleteChat(user.uid, chatId);
              console.log('Chat deleted successfully');
              // Reload chats
              await loadChats();
            } catch (error) {
              console.error('Error deleting chat:', error);
            }
          }
        }
      ]
    );
    
    console.log('Alert.alert called');
  };

  const handleLogout = async () => {
    console.log('Logging out...');
    try {
      await signOutAsync();
      console.log('Sign out successful, navigating to Login');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleSubscribe = async () => {
    console.log('=== Dashboard handleSubscribe START ===');
    console.log('Dashboard handleSubscribe: user exists:', !!user);
    if (!user) {
      console.log('Dashboard handleSubscribe: No user, aborting');
      return;
    }
    
    try {
      console.log('Dashboard handleSubscribe: Calling startPurchaseFlow...');
      await startPurchaseFlow(user.uid);
      console.log('Dashboard handleSubscribe: Purchase flow completed');
      
      console.log('Dashboard handleSubscribe: Calling refresh...');
      await refresh();
      console.log('Dashboard handleSubscribe: Subscription refreshed');
      console.log('Dashboard handleSubscribe: canChat is now:', canChat);
      console.log('=== Dashboard handleSubscribe SUCCESS ===');
    } catch (error) {
      console.error('=== Dashboard handleSubscribe ERROR ===');
      console.error('Error in Dashboard handleSubscribe:', error);
    }
  };

  const formatTime = (date: Date | any) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={dashboardBg}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.15 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 40 }}>
          {/* Header row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: "#facc15",
                fontSize: 28,
                fontWeight: "bold",
                letterSpacing: 0.5,
              }}
            >
              Tarot Oracle
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                onPress={handleLogout}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: "#ef4444",
                }}
              >
                <LogOut color="#ef4444" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubscribe}
                style={{
                  backgroundColor: "#581c87",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#a855f7",
                }}
              >
                <Text style={{ color: "#e9d5ff", fontSize: 15, fontWeight: "600" }}>
                  Enlighten 🔮
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* New Chat button - Always enabled, ChatScreen handles subscription */}
          <TouchableOpacity
            onPress={handleNewChat}
            style={{
              backgroundColor: "#1e3a8a",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 2,
              borderColor: "#60a5fa",
            }}
          >
            <Text
              style={{
                color: "#93c5fd",
                fontSize: 18,
                fontWeight: "600",
                letterSpacing: 0.5,
              }}
            >
              New Chat
            </Text>
          </TouchableOpacity>

          {/* Static card preview */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                borderWidth: 2,
                borderColor: "#facc15",
                borderRadius: 12,
                padding: 24,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                width: "100%",
                maxWidth: 320,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 16,
                  gap: 12,
                }}
              >
                <Star color="#facc15" size={28} fill="#facc15" />
                <Sun color="#facc15" size={44} fill="#facc15" />
                <Moon color="#facc15" size={28} fill="#facc15" />
              </View>
              <Text
                style={{
                  color: "#facc15",
                  fontSize: 22,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textAlign: "center",
                }}
              >
                THE SUN
              </Text>
            </View>
          </View>

          {/* Chat list */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <ActivityIndicator size="large" color="#facc15" />
              </View>
            ) : (
              Object.entries(chatGroups).map(([dateLabel, items]) =>
                items.length > 0 ? (
                  <View key={dateLabel} style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        color: "#a78bfa",
                        fontSize: 13,
                        fontWeight: "600",
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {dateLabel}
                    </Text>
                    {items.map((chat) => (
                      <TouchableOpacity
                        key={chat.id}
                        onPress={() => handleOpenChat(chat.id)}
                        onLongPress={() => {
                          console.log('Long press triggered for chat:', chat.id);
                          handleDeleteChat(chat.id);
                        }}
                        delayLongPress={500}
                        style={{
                          backgroundColor: "rgba(30, 41, 59, 0.8)",
                          padding: 16,
                          borderRadius: 12,
                          marginBottom: 10,
                          borderLeftWidth: 3,
                          borderLeftColor: "#facc15",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <MessageCircle color="#60a5fa" size={20} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#fde68a", fontSize: 16, fontWeight: "500" }}>
                            {chat.title || "New Reading"}
                          </Text>
                          {chat.updatedAt && (
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                              <Clock color="#94a3b8" size={12} style={{ marginRight: 4 }} />
                              <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                                {formatTime(chat.updatedAt)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null
              )
            )}
            {!loading && Object.values(chatGroups).every(arr => arr.length === 0) && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <MessageCircle color="#475569" size={48} />
                <Text style={{ color: "#64748b", fontSize: 16, marginTop: 16, textAlign: "center" }}>
                  No chats yet.{"\n"}Start a new reading above!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
      
      {/* AdMob Banner at bottom */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <AdBanner />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;
