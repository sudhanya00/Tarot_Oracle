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
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import {
  emailSignIn,
  forgotPassword,
  signInWithGoogleAsync,
  signInWithAppleAsync,
} from "../lib/auth";
import { useSub } from "../context/SubscriptionProvider";
import { useAuth } from "../context/AuthProvider";
import PrivacyPolicyScreen from "./PrivacyPolicyScreen";

// --- Helper Functions ---

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
const getFriendlyErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// ... (checkPrivacyPolicyAccepted, checkIfFirstLogin, markPrivacyPolicyAccepted remain the same)

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { refresh } = useSub();
  const { user, signOutAsync } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // New loading state
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // --- Effects ---

  useEffect(() => {
    const fromLogout = route?.params?.fromLogout;
    if (fromLogout) {
      setIsLoggingOut(true);
      setShowPrivacyPolicy(false);
      setPendingNavigation(false);
      
      if (navigation?.setParams) {
        navigation.setParams({ fromLogout: undefined });
      }
      
      const timer = setTimeout(() => setIsLoggingOut(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.fromLogout]);

  useEffect(() => {
    if (isLoggingOut) return;

    if (user && !pendingNavigation) {
      checkPrivacyPolicyAccepted(user.uid).then(accepted => {
        if (!accepted) {
          setShowPrivacyPolicy(true);
        } else {
          navigation.replace("Dashboard");
        }
      });
    } else if (!user && !isLoggingOut) {
      setShowPrivacyPolicy(false);
      setPendingNavigation(false);
    }
  }, [user, pendingNavigation, isLoggingOut]);

  // --- Handlers ---

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Input Required", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await emailSignIn(email.trim(), password);
      await refresh();
      // Privacy check is handled by the useEffect above
    } catch (err: any) {
      Alert.alert("Login Error", getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Enter your email to receive a reset link.");
      return;
    }
    try {
      await forgotPassword(email.trim());
      Alert.alert("Password Reset", "If this email exists, reset instructions have been sent.");
    } catch (err: any) {
      Alert.alert("Error", getFriendlyErrorMessage(err.code));
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogleAsync();
      await refresh();
    } catch (err: any) {
      if (err.code !== 'auth/cancelled-popup-request') {
        Alert.alert("Google Error", getFriendlyErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (handleApple, handlePrivacyPolicyAccept/Decline remain the same)

  return (
    <View style={styles.container}>
      <Modal visible={showPrivacyPolicy} animationType="slide" presentationStyle="fullScreen">
        <PrivacyPolicyScreen
          onAccept={handlePrivacyPolicyAccept}
          onDecline={handlePrivacyPolicyDecline}
        />
      </Modal>

      <Text style={styles.title}>Welcome Back</Text>

      <View style={styles.block}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#7aa0c4"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          editable={!loading}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#7aa0c4"
          secureTextEntry
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
          onPress={handleEmailLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Log in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForgot} disabled={loading}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        
        {/* Updated Navigation Link */}
        <TouchableOpacity onPress={() => navigation.navigate("SignUpScreen")} disabled={loading}>
          <Text style={styles.linkText}>Don’t have an account? <Text style={{fontWeight: '700'}}>Signup</Text></Text>
        </TouchableOpacity>
      </View>

      <View style={styles.providers}>
        <TouchableOpacity style={styles.providerBtn} onPress={handleGoogle} disabled={loading}>
          <Text style={styles.providerText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity style={styles.providerBtn} onPress={handleApple} disabled={loading}>
            <Text style={styles.providerText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default LoginScreen;
