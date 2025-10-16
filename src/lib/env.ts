import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  OPENAI_API_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  ADMOB_BANNER_ID: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
  MODE: 'mock' | 'prod';
  STRIPE_CHECKOUT_URL?: string;
  STRIPE_PORTAL_URL?: string;
};

export const extra = (Constants?.expoConfig?.extra || {}) as Extra;

export const isMock = () => {
  // Respect MODE setting from .env
  // MODE=mock uses mock authentication
  // MODE=prod uses real Firebase (requires React Native Firebase on mobile)
  return (extra.MODE || 'mock') === 'mock';
};
