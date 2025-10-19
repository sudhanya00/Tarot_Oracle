import React from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { extra } from './env';

export default function AdBanner() {
  // Don't show ads on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Use test ad unit ID in development, real ID in production
  const adUnitId = __DEV__ 
    ? TestIds.BANNER 
    : extra.ADMOB_BANNER_ID || TestIds.BANNER;

  return (
    <View style={{ 
      alignItems: 'center', 
      backgroundColor: '#000',
      paddingVertical: 8,
    }}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('AdMob: Banner ad loaded successfully');
        }}
        onAdFailedToLoad={(error) => {
          console.error('AdMob: Banner ad failed to load:', error);
        }}
      />
    </View>
  );
}
