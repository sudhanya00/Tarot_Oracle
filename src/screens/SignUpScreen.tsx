// src/screens/SignUpScreen.tsx
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft, Lock, Mail, User } from "lucide-react-native";

import { emailSignUp } from "../lib/auth";
import { friendlyAuthError } from "../lib/authErrors";
import { saveDisplayName } from "../lib/profile";
import CosmicBackground from "../components/magic/CosmicBackground";
import GlassPanel from "../components/magic/GlassPanel";
import GlowButton from "../components/magic/GlowButton";
import GlowInput from "../components/magic/GlowInput";
import PressableScale from "../components/magic/PressableScale";
import { useAuthRouting } from "../components/PrivacyConsent";
import { colors, fonts, type } from "../theme";

const oracle = require("../../assets/images/hooded_oracle.png");

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { routeAfterAuth, consentModal } = useAuthRouting();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Login"));

  const handleSignup = async () => {
    if (busy) return;
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("A few details missing", "Please fill in your name, email, and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Password should be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const { user } = await emailSignUp(email.trim(), password);
      await saveDisplayName(user.uid, name.trim());
      // New accounts haven't accepted the policy yet, so this opens the consent screen.
      await routeAfterAuth(user.uid);
    } catch (err: any) {
      Alert.alert("Couldn't create your account", friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CosmicBackground image={oracle} imageOpacity={0.3}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PressableScale onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={22} color={colors.text} />
          </PressableScale>

          <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
            <Text style={type.title}>Create an account</Text>
            <Text style={type.caption}>Your readings are saved so you can come back to them.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(800)}>
            <GlassPanel style={styles.panel}>
              <GlowInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                autoComplete="name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                icon={<User size={18} color={colors.textMuted} />}
              />
              <GlowInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                icon={<Mail size={18} color={colors.textMuted} />}
              />
              <GlowInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Password (6+ characters)"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleSignup}
                icon={<Lock size={18} color={colors.textMuted} />}
              />
              <GlowButton label="Create account" onPress={handleSignup} loading={busy} />
            </GlassPanel>
          </Animated.View>

          <Pressable onPress={goBack} style={styles.signin} hitSlop={8}>
            <Text style={type.caption}>
              Already have an account? <Text style={styles.linkStrong}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      {consentModal}
    </CosmicBackground>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, width: "100%", maxWidth: 480, alignSelf: "center" },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginBottom: 28,
  },
  header: { gap: 4, marginBottom: 24 },
  panel: { padding: 20, gap: 14 },
  linkStrong: { fontFamily: fonts.bodySemi, color: colors.gold },
  signin: { alignItems: "center", marginTop: 22 },
});
