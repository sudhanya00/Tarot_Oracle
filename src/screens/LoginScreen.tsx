// src/Screens/LoginScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Lock, Mail } from "lucide-react-native";

import {
  emailSignIn,
  forgotPassword,
  signInWithGoogleAsync,
  signInWithAppleAsync,
} from "../lib/auth";
import { friendlyAuthError, isAuthCancelled } from "../lib/authErrors";
import { useAuth } from "../context/AuthProvider";
import CosmicBackground from "../components/magic/CosmicBackground";
import GlassPanel from "../components/magic/GlassPanel";
import GlowButton from "../components/magic/GlowButton";
import GlowInput from "../components/magic/GlowInput";
import { FloatingCard } from "../components/magic/TarotCard";
import { useAuthRouting } from "../components/PrivacyConsent";
import { colors, fonts, type } from "../theme";

const oracle = require("../../assets/images/hooded_oracle.png");

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { routeAfterAuth, consentModal } = useAuthRouting();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);
  // Right after logout the auth listener can still report the old user for a moment;
  // ignore it until it clears so we don't bounce straight back to the dashboard.
  const [ignoreUser, setIgnoreUser] = useState(!!route.params?.fromLogout);

  // Someone already signed in (a saved session) skips the form.
  useEffect(() => {
    if (!user) {
      setIgnoreUser(false);
      return;
    }
    if (!ignoreUser && !busy) routeAfterAuth(user.uid);
  }, [user?.uid, ignoreUser]);

  const run = async (kind: "email" | "google" | "apple", action: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const handleEmailLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert("Email and password needed", "Please enter both your email and password.");
      return;
    }
    run("email", async () => {
      try {
        const { user: signedIn } = await emailSignIn(email.trim(), password);
        await routeAfterAuth(signedIn.uid);
      } catch (err: any) {
        Alert.alert("Couldn't sign in", friendlyAuthError(err));
      }
    });
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      Alert.alert("Email needed", "Enter your email above and we'll send you a reset link.");
      return;
    }
    try {
      await forgotPassword(email.trim());
      Alert.alert("Check your inbox", "If an account exists for that email, we've sent a reset link.");
    } catch (err: any) {
      Alert.alert("Couldn't send reset email", friendlyAuthError(err));
    }
  };

  const handleGoogle = () =>
    run("google", async () => {
      try {
        const signedIn = await signInWithGoogleAsync();
        await routeAfterAuth(signedIn.uid);
      } catch (err: any) {
        console.error("Google sign in error:", err);
        if (!isAuthCancelled(err)) Alert.alert("Couldn't sign in with Google", friendlyAuthError(err));
      }
    });

  // Facebook provider removed

  const handleApple = () =>
    run("apple", async () => {
      try {
        if (Platform.OS !== "ios") {
          Alert.alert("Apple Sign-in", "Apple Sign-in only works on iOS.");
          return;
        }
        const signedIn = await signInWithAppleAsync();
        await routeAfterAuth(signedIn.uid);
      } catch (err: any) {
        if (!isAuthCancelled(err)) Alert.alert("Couldn't sign in with Apple", friendlyAuthError(err));
      }
    });

  return (
    <CosmicBackground image={oracle} imageOpacity={0.3}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(900)} style={styles.header}>
            <FloatingCard width={64} face="star" tilt={-4} amplitude={6} style={{ marginBottom: 18 }} />
            <Text style={type.title}>Sign in</Text>
            <Text style={type.caption}>Your readings are saved to your account.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(900)}>
            <GlassPanel style={styles.panel}>
              <GlowInput
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
                placeholder="Password"
                secureTextEntry
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleEmailLogin}
                icon={<Lock size={18} color={colors.textMuted} />}
              />

              <Pressable onPress={handleForgot} style={styles.forgot} hitSlop={8}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>

              <GlowButton label="Sign in" onPress={handleEmailLogin} loading={busy === "email"} />

              <View style={styles.divider}>
                <View style={styles.rule} />
                <Text style={styles.or}>or</Text>
                <View style={styles.rule} />
              </View>

              <GlowButton variant="glass" label="Continue with Google" onPress={handleGoogle} loading={busy === "google"} />
              {Platform.OS === "ios" && (
                <GlowButton variant="glass" label="Continue with Apple" onPress={handleApple} loading={busy === "apple"} />
              )}
            </GlassPanel>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(900)}>
            <Pressable onPress={() => navigation.navigate("SignUp")} style={styles.signup} hitSlop={8}>
              <Text style={type.caption}>
                No account? <Text style={styles.linkStrong}>Create one</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {consentModal}
    </CosmicBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, width: "100%", maxWidth: 480, alignSelf: "center" },
  header: { alignItems: "flex-start", gap: 4, marginBottom: 24 },
  panel: { padding: 20, gap: 14 },
  forgot: { alignSelf: "flex-end", marginTop: -4 },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.moon },
  linkStrong: { fontFamily: fonts.bodySemi, color: colors.gold },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  or: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  signup: { alignItems: "center", marginTop: 22 },
});
