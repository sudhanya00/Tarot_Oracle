// App.tsx
import "./global.css"; // required for NativeWind on web
// Main entry point for the Tarot Oracle application.

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Firebase and provider imports
import { initializeFirebase } from './src/lib/firebase-config';
import { AuthProvider } from './src/context/AuthProvider';
import { SubscriptionProvider } from './src/context/SubscriptionProvider';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';

// Stack navigator
const Stack = createNativeStackNavigator();

// Validate environment variables
const validateEnvironment = () => {
  const { extra, isMock } = require('./src/lib/env');
  
  // Always required (for both web and mobile, because these are used in JS/TS code)
  if (!extra.OPENAI_API_KEY && !isMock()) {
    console.warn('Warning: OPENAI_API_KEY is missing. AI features will not work in production mode.');
    // Don't fail hard as mock mode might be used for testing
  }

  // Stripe validation (optional but good to warn) - for both web and mobile
  if (!extra.STRIPE_PUBLISHABLE_KEY && !extra.STRIPE_CHECKOUT_URL && !isMock()) {
    console.warn('Warning: Stripe is not configured. Subscription features will not work.');
  }

  // Firebase config validation: only for web, because mobile uses native config files
  if (Platform.OS === 'web') {
    const requiredFirebaseFields = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN', 
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID'
    ];

    const missingFirebaseFields = requiredFirebaseFields.filter(field => !extra[field]);
    if (missingFirebaseFields.length > 0 && !isMock()) {
      console.error('Missing required Firebase configuration for web:', missingFirebaseFields);
      Alert.alert(
        'Configuration Error',
        'Missing required Firebase configuration for web. Please check your app.config.js or .env file.',
        [{ text: 'OK' }]
      );
      // Don't throw as we might want to continue in dev
    }
  }
};

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // Validate environment first
    validateEnvironment();
    
    // Initialize Firebase once at app startup
    initializeFirebase()
      .then(() => {
        console.log('Firebase initialized at app startup');
        setFirebaseReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Firebase:', error);
        setFirebaseReady(true); // Continue anyway
      });
  }, []);

  if (!firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
