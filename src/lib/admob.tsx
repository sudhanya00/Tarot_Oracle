import React, { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, BannerAdProps } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

export default function AdBanner() {
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get banner ID from config
    const adUnitId = Constants.expoConfig?.extra?.ADMOB_BANNER_ID;
    
    console.log('AdBanner: Config ADMOB_BANNER_ID:', adUnitId);
    
    // Use test ID in development, real ID in production
    if (adUnitId && adUnitId.startsWith('ca-app-pub-')) {
      console.log('AdBanner: Using real banner ID');
      setBannerId(adUnitId);
    } else {
      // Use test ID if no valid ID found
      const testId = Platform.OS === 'ios' ? TestIds.BANNER : TestIds.BANNER;
      console.log('AdBanner: Using test banner ID:', testId);
      setBannerId(testId);
    }
  }, []);

  if (!bannerId) {
    return null;
  }

  return (
    <View>
      <BannerAd
        unitId={bannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('AdBanner: Ad loaded successfully');
          setError(null);
        }}
        onAdFailedToLoad={(err) => {
          console.log('AdBanner: Failed to load ad:', err);
          setError(err.message);
        }}
      />
      {__DEV__ && error && (
        <Text style={{ color: 'red', fontSize: 10, textAlign: 'center' }}>
          Ad Error: {error}
        </Text>
      )}
    </View>
  );
}
