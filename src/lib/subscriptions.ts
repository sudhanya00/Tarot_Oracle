import { Platform } from 'react-native';
import { isMock } from './env';
import * as WebBrowser from 'expo-web-browser';

// Mock subscription store for mobile testing
const mockSubscriptions: Record<string, { isActive: boolean; updatedAt: number }> = {};

export type Subscription = {
  isActive: boolean;
  expiresAt?: number; // ms epoch
  updatedAt?: any;
};

export async function checkSubscription(uid: string): Promise<boolean> {
  console.log('checkSubscription: START for user:', uid);
  
  // Check in-memory first (for when Firestore fails)
  if (mockSubscriptions[uid]?.isActive) {
    console.log('checkSubscription: Found active in-memory subscription');
    return true;
  }
  
  if (isMock()) {
    // Mock mode: always return true for testing
    console.log('checkSubscription: Mock mode, returning true');
    return true;
  }

  try {
    if (Platform.OS === 'web') {
      console.log('checkSubscription: Web platform');
      // Web only - dynamic import Firebase
      const { doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebase } = await import('./firebase-config');
      const { db } = await initializeFirebase();

      if (!db) {
        console.log('checkSubscription: Firebase DB not available');
        return false;
      }

      const ref = doc(db, 'subscriptions', uid);
      const snap = await getDoc(ref);
      const data = snap.data() as Subscription | undefined;
      const isActive = !!(data && data.isActive && (!data.expiresAt || data.expiresAt > Date.now()));
      console.log('checkSubscription: Web result:', isActive);
      return isActive;
    } else {
      console.log('checkSubscription: Mobile platform');
      // Mobile: React Native Firebase
      const firestore = (await import('@react-native-firebase/firestore')).default;
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout')), 5000);
      });
      
      const queryPromise = firestore().collection('subscriptions').doc(uid).get();
      const snap = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('checkSubscription: Subscription doc exists:', snap.exists);
      
      if (!snap.exists) {
        console.log('checkSubscription: No subscription doc found');
        return false;
      }
      
      const data = snap.data() as Subscription | undefined;
      const isActive = !!(data && data.isActive && (!data.expiresAt || data.expiresAt > Date.now()));
      console.log('checkSubscription: Mobile result:', isActive);
      return isActive;
    }
  } catch (error: any) {
    console.error('checkSubscription: ERROR:', error?.message || error);
    // Check in-memory as fallback
    if (mockSubscriptions[uid]?.isActive) {
      console.log('checkSubscription: Using in-memory fallback, returning true');
      return true;
    }
    // Re-throw with more context
    const enhancedError: any = new Error(`Subscription check failed: ${error?.message || 'Unknown error'}`);
    enhancedError.code = error?.code || 'firestore/error';
    throw enhancedError;
  }
}

export async function mockActivate(uid: string): Promise<void> {
  console.log('mockActivate: START for user:', uid);
  
  if (isMock()) {
    console.log('mockActivate: Using in-memory mock store');
    mockSubscriptions[uid] = { isActive: true, updatedAt: Date.now() };
    console.log('mockActivate: COMPLETE (mock)');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      console.log('mockActivate: Web platform');
      // Web only - dynamic import Firebase
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { initializeFirebase } = await import('./firebase-config');
      const { db } = await initializeFirebase();

      if (!db) {
        console.warn('mockActivate: No DB available');
        return;
      }

      const ref = doc(db, 'subscriptions', uid);
      await setDoc(ref, { isActive: true, updatedAt: serverTimestamp() }, { merge: true });
      console.log('mockActivate: COMPLETE (web)');
    } else {
      console.log('mockActivate: Mobile platform - writing to Firestore');
      // Mobile: React Native Firebase with timeout
      const firestore = (await import('@react-native-firebase/firestore')).default;
      
      const setPromise = firestore().collection('subscriptions').doc(uid).set(
        { isActive: true, updatedAt: firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      
      const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        console.warn('mockActivate: Firestore write timeout after 3 seconds');
        resolve(null);
      }, 3000));
      
      await Promise.race([setPromise, timeoutPromise]);
      console.log('mockActivate: COMPLETE (mobile - may have timed out)');
    }
  } catch (error) {
    console.error('mockActivate: ERROR:', error);
    // Don't throw - we'll use in-memory fallback
    console.log('mockActivate: Using in-memory fallback due to error');
    mockSubscriptions[uid] = { isActive: true, updatedAt: Date.now() };
  }
  
  console.log('mockActivate: Setting in-memory subscription as fallback');
  mockSubscriptions[uid] = { isActive: true, updatedAt: Date.now() };
}

export async function startPurchaseFlow(uid: string): Promise<void> {
  // For now, just activate the subscription directly for testing
  // TODO: Replace with actual Stripe payment flow when ready
  console.log('Starting purchase flow for user:', uid);
  await mockActivate(uid);
  
  // Uncomment below when Stripe is configured:
  // if (isMock()) {
  //   await mockActivate(uid);
  //   return;
  // }
  // const extra = (await import('./env')).extra;
  // const url = extra.STRIPE_CHECKOUT_URL || extra.STRIPE_PORTAL_URL;
  // if (!url) throw new Error('Stripe URLs not configured.');
  // await WebBrowser.openBrowserAsync(url);
}

