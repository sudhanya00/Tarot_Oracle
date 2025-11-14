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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import {
  emailSignIn,
  emailSignUp,
  forgotPassword,
  signInWithGoogleAsync,
  signInWithAppleAsync,
} from "../lib/auth";
import { useSub } from "../context/SubscriptionProvider";
import { useAuth } from "../context/AuthProvider";
import PrivacyPolicyScreen from "./PrivacyPolicyScreen";

// Helper to check and update privacy policy acceptance
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
      
      // Check if user was created within the last minute (indicates first login)
      const createdAtMs = createdAt.toMillis ? createdAt.toMillis() : createdAt;
      const now = Date.now();
      const oneMinute = 60 * 1000;
      
      return (now - createdAtMs) < oneMinute;
    } else {
      const firestore = (await import('@react-native-firebase/firestore')).default;
      const userDoc = await firestore().collection('users').doc(uid).get();
      
      if (!userDoc.exists) return false;
      
      const userData = userDoc.data();
      const createdAt = userData?.createdAt;
      
      if (!createdAt) return false;
      
      // Check if user was created within the last minute
      const createdAtMs = createdAt.toMillis ? createdAt.toMillis() : createdAt;
      const now = Date.now();
      const oneMinute = 60 * 1000;
      
      return (now - createdAtMs) < oneMinute;
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
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Detect logout navigation and prevent any privacy modal
  useEffect(() => {
    const fromLogout = route?.params?.fromLogout;
    if (fromLogout) {
      console.log('LoginScreen: Detected fromLogout param, setting isLoggingOut flag');
      setIsLoggingOut(true);
      setShowPrivacyPolicy(false); // Explicitly close modal if it was open
      // Clear the param
      if (navigation && (navigation as any).setParams) {
        try {
          (navigation as any).setParams({ fromLogout: undefined });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [route?.params?.fromLogout]);

  // Check if logged-in user has accepted privacy policy
  useEffect(() => {
    // Skip privacy check entirely if we're in logout flow
    if (isLoggingOut) {
      console.log('LoginScreen: Skipping privacy check due to logout');
      // Ensure modal is closed during logout
      if (showPrivacyPolicy) {
        setShowPrivacyPolicy(false);
      }
      return;
    }

    if (user && !pendingNavigation) {
      console.log('LoginScreen: User detected, checking privacy policy acceptance');
      checkPrivacyPolicyAccepted(user.uid).then(accepted => {
        if (!accepted) {
          console.log('LoginScreen: Privacy policy not accepted, showing modal');
          setShowPrivacyPolicy(true);
        } else {
          console.log('LoginScreen: Privacy policy already accepted, navigating to Dashboard');
          navigation.replace("Dashboard");
        }
      });
    } else if (!user) {
      // User has been cleared, reset all flags
      console.log('LoginScreen: User cleared, resetting flags');
      setIsLoggingOut(false);
      setShowPrivacyPolicy(false);
      setPendingNavigation(false);
    }
  }, [user, pendingNavigation, isLoggingOut]);

  const handlePrivacyPolicyAccept = async () => {
    if (user) {
      try {
        await markPrivacyPolicyAccepted(user.uid);
        setShowPrivacyPolicy(false);
        setPendingNavigation(true);
        
        // Check if this is the user's first login
        const isFirstLogin = await checkIfFirstLogin(user.uid);
        
        if (isFirstLogin) {
          // Show free trial notification
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
        Alert.alert("Error", "Failed to save privacy policy acceptance. Please try again.");
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
  };  const handleEmailLogin = async () => {
    try {
      await emailSignIn(email.trim(), password);
      await refresh();
      // Privacy policy check happens in useEffect
    } catch (err: any) {
      Alert.alert("Login Error", err?.message || "Could not sign in.");
    }
  };

  const handleEmailSignup = async () => {
    try {
      await emailSignUp(email.trim(), password);
      await refresh();
      // Privacy policy check happens in useEffect
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
      // Privacy policy check happens in useEffect
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
      // Privacy policy check happens in useEffect
    } catch (err: any) {
      Alert.alert("Apple Error", err?.message || "Could not sign in with Apple.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrivacyPolicyScreen
          onAccept={handlePrivacyPolicyAccept}
          onDecline={handlePrivacyPolicyDecline}
        />
      </Modal>

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
