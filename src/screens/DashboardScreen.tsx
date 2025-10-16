// src/screens/DashboardScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Star, Sun, Moon } from "lucide-react-native";

import dashboardBg from "../../assets/images/dashboard_bg.png";
import Button from "../components/ui/button";
import Card, { CardContent } from "../components/ui/card";

import { useAuth } from "../context/AuthProvider";
import { useSub } from "../context/SubscriptionProvider";
import { startPurchaseFlow } from "../lib/subscriptions";
import { listChats, groupByDate, Chat } from "../hooks/useChats";

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { canChat, refresh } = useSub();

  const [chatGroups, setChatGroups] = useState<Record<string, Chat[]>>({
    Today: [],
    Yesterday: [],
    Older: [],
  });

  useEffect(() => {
    (async () => {
      if (!user) return;
      const items = await listChats(user.uid);
      setChatGroups(groupByDate(items));
    })();
  }, [user?.uid]);

  const handleNewChat = () => {
    if (!canChat) {
      return handleSubscribe();
    }
    navigation.navigate("Chat");
  };

  const handleOpenChat = (chatId: string) => {
    navigation.navigate("Chat", { chatId });
  };

  const handleSubscribe = async () => {
    if (!user) return;
    await startPurchaseFlow(user.uid);
    await refresh();
  };

  return (
    <ImageBackground
      source={dashboardBg}
      style={{ flex: 1 }}
      imageStyle={{ opacity: 0.1 }}
    >
      <View style={{ flex: 1, padding: 20 }}>
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#facc15",
              fontSize: 32,
              fontWeight: "bold",
              letterSpacing: 1,
            }}
          >
            Tarot Oracle
          </Text>

          <Button
            onPress={handleSubscribe}
            className="border border-yellow-300 bg-transparent px-4 py-2 text-lg"
          >
            Enlighten 🔮
          </Button>
        </View>

        {/* New Chat button */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Button
            onPress={handleNewChat}
            disabled={!canChat}
            className={`px-6 py-3 text-lg ${
              canChat
                ? "border-yellow-300 text-yellow-300"
                : "border-yellow-800 text-yellow-800 opacity-60"
            }`}
          >
            New Chat
          </Button>
        </View>

        {/* Static card preview */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Card className="w-full max-w-sm border-2 border-yellow-300 bg-transparent">
            <CardContent className="flex flex-col items-center py-8">
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Star color="#facc15" size={32} style={{ marginRight: 8 }} />
                <Sun color="#facc15" size={48} style={{ marginRight: 8 }} />
                <Moon color="#facc15" size={32} />
              </View>
              <Text
                style={{
                  color: "#facc15",
                  fontSize: 20,
                  fontWeight: "600",
                  letterSpacing: 1,
                }}
              >
                THE SUN
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Chat list */}
        <ScrollView style={{ marginTop: 24, flex: 1 }}>
          {Object.entries(chatGroups).map(([dateLabel, items]) =>
            items.length > 0 ? (
              <View key={dateLabel} style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#fbbf24",
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  {dateLabel}
                </Text>
                {items.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => handleOpenChat(chat.id)}
                    style={{
                      backgroundColor: "#0d1423",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: "#fcd34d", fontSize: 16 }}>
                      {chat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

export default DashboardScreen;
