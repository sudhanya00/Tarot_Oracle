// src/Screens/LoginScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import {
  emailSignIn,
  emailSignUp,
  forgotPassword,
  signInWithGoogleAsync,
  signInWithAppleAsync,
} from "../lib/auth";
import { useSub } from "../context/SubscriptionProvider";

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { refresh } = useSub();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");  const handleEmailLogin = async () => {
    try {
      await emailSignIn(email.trim(), password);
      await refresh();
      navigation.replace("Dashboard");
    } catch (err: any) {
      Alert.alert("Login Error", err?.message || "Could not sign in.");
    }
  };

  const handleEmailSignup = async () => {
    try {
      await emailSignUp(email.trim(), password);
      await refresh();
      navigation.replace("Dashboard");
    } catch (err: any) {
      Alert.alert("Signup Error", err?.message || "Could not create account.");
    }
  };

  const handleForgot = async () => {
    try {
      await forgotPassword(email.trim());
      Alert.alert("Password Reset", "If this email exists, reset instructions sent.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not send reset email.");
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogleAsync();
      await refresh();
      navigation.replace("Dashboard");
    } catch (err: any) {
      console.error('Google sign in error:', err);
      Alert.alert("Google Error", err?.message || "Could not sign in with Google.");
    }
  };

  // Facebook provider removed

  const handleApple = async () => {
    try {
      if (Platform.OS !== "ios") {
        Alert.alert("Apple Sign-in", "Apple Sign-in only works on iOS.");
        return;
      }
      await signInWithAppleAsync();
      await refresh();
      navigation.replace("Dashboard");
    } catch (err: any) {
      Alert.alert("Apple Error", err?.message || "Could not sign in with Apple.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make an Auth!</Text>

      {/* Email / Password */}
      <View style={styles.block}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#7aa0c4"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#7aa0c4"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailLogin}>
          <Text style={styles.primaryBtnText}>Log in</Text>
        </TouchableOpacity>

        {/* Links under button */}
        <TouchableOpacity onPress={handleForgot}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEmailSignup}>
          <Text style={styles.linkText}>Don’t have an account? Signup</Text>
        </TouchableOpacity>
      </View>

      {/* Providers */}
      <View style={styles.providers}>
        <TouchableOpacity style={styles.providerBtn} onPress={handleGoogle}>
          <Text style={styles.providerText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity style={styles.providerBtn} onPress={handleApple}>
            <Text style={styles.providerText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    color: "#9fc5ff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  block: { gap: 12, marginBottom: 20 },
  input: {
    backgroundColor: "#0d1423",
    color: "#c2dbff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: "#1e3a8a",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkText: {
    color: "#7aa0c4",
    textAlign: "center",
    marginTop: 8,
    textDecorationLine: "underline",
  },
  providers: { marginTop: 10 },
  providerBtn: {
    backgroundColor: "#0d1423",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#21324f",
  },
  providerText: { color: "#c2dbff", fontSize: 15, fontWeight: "600" },
});
