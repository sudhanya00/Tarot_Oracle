// App.tsx
import "./global.css"; 
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initializeFirebase } from './src/lib/firebase-config';
import { AuthProvider } from './src/context/AuthProvider';
import { SubscriptionProvider } from './src/context/SubscriptionProvider';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen'; // 1. Import your new screen
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    initializeFirebase()
      .then(() => {
        setFirebaseReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Firebase:', error);
        setFirebaseReady(true); 
      });
  }, []);

  if (!firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#9fc5ff" />
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
              
              {/* 2. Register SignUpScreen with the exact name used in LoginScreen */}
              <Stack.Screen name="SignUpScreen" component={SignUpScreen} /> 
              
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
