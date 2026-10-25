// App.tsx
import "./global.css"; // required for NativeWind on web
// Main entry point for the Tarot Oracle application.

import React, { useEffect, useState } from 'react';
import { View, StatusBar, Alert, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { IMFellEnglish_400Regular } from '@expo-google-fonts/im-fell-english/400Regular';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';

// Firebase and provider imports
import { initializeFirebase } from './src/lib/firebase-config';
import { AuthProvider } from './src/context/AuthProvider';
import { SubscriptionProvider } from './src/context/SubscriptionProvider';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import CosmicBackground from './src/components/magic/CosmicBackground';
import { colors } from './src/theme';

// Stack navigator
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.night, card: colors.night },
};

// Validate environment variables
const validateEnvironment = () => {
  const { extra, isMock } = require('./src/lib/env');
  
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
  const [fontsLoaded, fontError] = useFonts({
    IMFellEnglish_400Regular,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });

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

  // Fall back to system fonts rather than blocking the app if a font fails to load.
  if (!firebaseReady || (!fontsLoaded && !fontError)) {
    return <CosmicBackground density="calm" />;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <View style={{ flex: 1, backgroundColor: colors.night }}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              initialRouteName="Welcome"
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 380,
                contentStyle: { backgroundColor: colors.night },
              }}
            >
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
