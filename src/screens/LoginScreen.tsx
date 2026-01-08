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

// --- Helper Functions (Privacy Policy & First Login Check) ---

async function checkPrivacyPolicyAccepted(uid: string): Promise<boolean> {
  try {
    const { Platform } = await import('react-native');

    if (Platform.OS === 'web') {
      const { doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();

      if (!db) return false;

      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data()?.privacyPolicyAccepted === true : false;
    } else {
      const firestore = (await import('@react-native-firebase/firestore')).default;
      const userDoc = await firestore().collection('users').doc(uid).get();
      return userDoc.exists ? userDoc.data()?.privacyPolicyAccepted === true : false;
    }
  } catch (error) {
    console.error('Error checking privacy policy acceptance:', error);
    return false;
  }
}

async function checkIfFirstLogin(uid: string): Promise<boolean> {
  try {
    const { Platform } = await import('react-native');

    if (Platform.OS === 'web') {
      const { doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();

      if (!db) return false;

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) return false;

      const userData = userDoc.data();
      const createdAt = userData?.createdAt;

      if (!createdAt) return false;

      const createdAtMs = createdAt.toMillis ? createdAt.toMillis() : createdAt;
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;

      return createdAtMs > oneMinuteAgo;
    } else {
      const firestore = (await import('@react-native-firebase/firestore')).default;
      const userDoc = await firestore().collection('users').doc(uid).get();
      if (!userDoc.exists) return false;

      const userData = userDoc.data();
      const createdAt = userData?.createdAt;

      if (!createdAt) return false;

      const createdAtMs = createdAt.toMillis ? createdAt.toMillis() : createdAt.toDate().getTime();
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;

      return createdAtMs > oneMinuteAgo;
    }
  } catch (error) {
    console.error('Error checking first login:', error);
    return false;
  }
}

async function markPrivacyPolicyAccepted(uid: string): Promise<void> {
  try {
    const { Platform } = await import('react-native');

    if (Platform.OS === 'web') {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();

      if (!db) return;

      await updateDoc(doc(db, 'users', uid), {
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: serverTimestamp()
      });
    } else {
      const rnfFirestore = await import('@react-native-firebase/firestore');
      await rnfFirestore.default()
        .collection('users')
        .doc(uid)
        .update({
          privacyPolicyAccepted: true,
          privacyPolicyAcceptedAt: rnfFirestore.default.FieldValue.serverTimestamp()
        });
    }
  } catch (error) {
    console.error('Error marking privacy policy accepted:', error);
    throw error;
  }
}

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

  const handleApple = async () => {
    setLoading(true);
    try {
      if (Platform.OS !== "ios") {
        Alert.alert("Apple Sign-in", "Apple Sign-in only works on iOS.");
        return;
      }
      await signInWithAppleAsync();
      await refresh();
    } catch (err: any) {
      Alert.alert("Apple Error", getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPolicyAccept = async () => {
    if (user) {
      try {
        await markPrivacyPolicyAccepted(user.uid);
        setShowPrivacyPolicy(false);
        setPendingNavigation(true);

        const isFirstLogin = await checkIfFirstLogin(user.uid);

        if (isFirstLogin) {
          Alert.alert(
            "🎉 Welcome to Tarot Oracle!",
            "Your 24-hour free trial has started. Explore unlimited tarot readings and discover the wisdom of the cards.\n\nAfter 24 hours, subscribe to continue your mystical journey.",
            [
              {
                text: "Start Reading",
                onPress: () => navigation.replace("Dashboard")
              }
            ]
          );
        } else {
          navigation.replace("Dashboard");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to save privacy policy acceptance.");
      }
    }
  };

  const handlePrivacyPolicyDecline = async () => {
    setShowPrivacyPolicy(false);
    await signOutAsync();
    Alert.alert(
      "Privacy Policy Required",
      "You must accept the Privacy Policy to use this app."
    );
  };

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
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  primaryBtn: {
    backgroundColor: "#3B4FE0",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkText: {
    color: "#7aa0c4",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
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
