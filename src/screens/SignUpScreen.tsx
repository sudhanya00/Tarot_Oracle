import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";

// Contexts
import { useSub } from "../context/SubscriptionProvider";
import { useAuth } from "../context/AuthProvider";

// Components
import PrivacyPolicyScreen from "./PrivacyPolicyScreen";

// Firebase Config
import { auth, db } from "../lib/firebase-config";

// --- Helper Functions ---

const getFriendlyErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect ID/Password entered.';
    case 'auth/missing-password': 
       return 'Please enter your password.'; 
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

async function markPrivacyPolicyAccepted(uid: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const { updateDoc } = await import('firebase/firestore');
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

// --- Main Component ---

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { refresh } = useSub();
  const { user, signOutAsync } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  
  // This flag ensures we don't trigger the welcome alert multiple times
  const [isSignupFlow, setIsSignupFlow] = useState(false);

  // 1. Handle the actual Signup logic
  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    setIsSignupFlow(true); // Mark that we are in the middle of a fresh signup

    try {
      // A. Create Authentication User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // B. Calculate 24-Hour Trial Expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // C. Create User Document in Firestore
      // Note: We set privacyPolicyAccepted to FALSE initially.
      // The useEffect below will catch this and show the modal.
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: newUser.email,
        createdAt: serverTimestamp(),
        freeReadingExpiresAt: Timestamp.fromDate(expiresAt), // 24-hour logic
        isPremium: false,
        privacyPolicyAccepted: false, 
      });

      // D. Refresh Subscription Context
      await refresh();

    } catch (err: any) {
      Alert.alert("Signup Error", getFriendlyErrorMessage(err.code));
      setLoading(false);
      setIsSignupFlow(false);
    }
  };

  // 2. Effect to trigger Privacy Policy Modal after successful auth
  useEffect(() => {
    if (user && isSignupFlow) {
      // User is created and logged in, but we know they haven't accepted policy yet
      setShowPrivacyPolicy(true);
      setLoading(false);
    }
  }, [user, isSignupFlow]);

  // 3. Handle Privacy Policy Acceptance
  const handlePrivacyPolicyAccept = async () => {
    if (user) {
      try {
        await markPrivacyPolicyAccepted(user.uid);
        setShowPrivacyPolicy(false);

        // Show the 24-Hour Trial Welcome Message
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
      } catch (error) {
        Alert.alert("Error", "Failed to save privacy policy acceptance.");
      }
    }
  };

  const handlePrivacyPolicyDecline = async () => {
    setShowPrivacyPolicy(false);
    await signOutAsync();
    setIsSignupFlow(false); // Reset flow
    Alert.alert(
      "Privacy Policy Required",
      "You must accept the Privacy Policy to create an account."
    );
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

      <Text style={styles.title}>Create Account</Text>

      <View style={styles.block}>
        <TextInput
          placeholder="Name"
          placeholderTextColor="#7aa0c4"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor="#7aa0c4"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#7aa0c4"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // Matches LoginScreen
    paddingHorizontal: 20,
    justifyContent: "center",
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
    backgroundColor: "#3B4FE0", // Mystical Blue
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  linkText: {
    color: "#7aa0c4",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  linkHighlight: {
    color: "#93C5FD",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});