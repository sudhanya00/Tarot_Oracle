// App.tsx
import "./global.css"; // required for NativeWind on web
// Main entry point for the Tarot Oracle application.

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import mobileAds from 'react-native-google-mobile-ads';

// Initialize Firebase ONCE before anything else
import { initializeFirebase } from './src/lib/firebase-config';

// Providers
import { AuthProvider } from './src/context/AuthProvider';
import { SubscriptionProvider } from './src/context/SubscriptionProvider';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';

// AdMob banner at bottom (placeholder if no ID)
import AdBanner from './src/lib/admob';

const Stack = createNativeStackNavigator();

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
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

    // Initialize AdMob on mobile only
    if (Platform.OS !== 'web') {
      mobileAds()
        .initialize()
        .then(adapterStatuses => {
          console.log('AdMob initialized:', adapterStatuses);
        })
        .catch(error => {
          console.error('Failed to initialize AdMob:', error);
        });
    }
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
          <AdBanner />
        </View>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
