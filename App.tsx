//App.tsx
import "./global.css"; 
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. Double check these paths are 100% correct
import { initializeFirebase } from './src/lib/firebase-config';
import { AuthProvider } from './src/context/AuthProvider';
import { SubscriptionProvider } from './src/context/SubscriptionProvider';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen'; // Check if file is actually named SignUpScreen.tsx
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // We use a small delay to ensure the native bridge is ready
    const init = async () => {
      try {
        await initializeFirebase();
        setFirebaseReady(true);
      } catch (e) {
        console.error("Firebase Init Error:", e);
        setFirebaseReady(true); // Set to true anyway to avoid getting stuck
      }
    };
    init();
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
        <NavigationContainer>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar barStyle="light-content" />
            <Stack.Navigator 
              initialRouteName="Welcome" 
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              {/* Ensure the name matches what you call in navigation.navigate() */}
              <Stack.Screen name="SignUpScreen" component={SignUpScreen} /> 
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
