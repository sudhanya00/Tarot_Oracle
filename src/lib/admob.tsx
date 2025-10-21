import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

export default function AdBanner() {
  const [bannerId, setBannerId] = useState<string | null>(null);

  useEffect(() => {
    // Get banner ID from config
    const adUnitId = Constants.expoConfig?.extra?.ADMOB_BANNER_ID;
    
    // Use test ID in development, real ID in production
    if (adUnitId && adUnitId.startsWith('ca-app-pub-')) {
      setBannerId(adUnitId);
    } else {
      // Use test ID if no valid ID found
      setBannerId(Platform.OS === 'ios' ? TestIds.BANNER : TestIds.BANNER);
    }
  }, []);

  if (!bannerId) {
    return null;
  }

  return (
    <BannerAd
      unitId={bannerId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: false,
      }}
    />
  );
}
