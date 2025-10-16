import React from 'react';
import { View } from 'react-native';
// Temporarily disabled AdMob - the expo-ads-admob package is deprecated and causing issues
// import { AdMobBanner, setTestDeviceIDAsync } from 'expo-ads-admob';
import { extra } from './env';

// minimal, no style changes to your screens; sits at absolute bottom if used globally
export default function AdBanner() {
  // Disabled AdMob temporarily
  return <View style={{ height: 50 }} />; // placeholder height, avoids layout jump
}
