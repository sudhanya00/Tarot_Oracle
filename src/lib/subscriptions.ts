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
  console.log('Starting purchase flow for user:', uid);
  
  // In mock mode, just activate directly for testing
  if (isMock()) {
    console.log('Mock mode: Activating subscription directly');
    await mockActivate(uid);
    return;
  }
  
  try {
    const extra = (await import('./env')).extra;
    
    // Check if Stripe is configured
    if (!extra.STRIPE_CHECKOUT_URL && !extra.STRIPE_PUBLISHABLE_KEY) {
      console.warn('Stripe not configured, using mock activation');
      await mockActivate(uid);
      return;
    }
    
    // Option 1: Use pre-configured checkout URL (if you have a hosted Stripe page)
    if (extra.STRIPE_CHECKOUT_URL) {
      console.log('Opening Stripe Checkout URL:', extra.STRIPE_CHECKOUT_URL);
      const result = await WebBrowser.openBrowserAsync(
        `${extra.STRIPE_CHECKOUT_URL}?client_reference_id=${uid}`
      );
      console.log('Stripe Checkout result:', result);
      // Do NOT auto-activate on dismiss - wait for webhook
      if (result.type === 'dismiss' || result.type === 'cancel') {
        console.log('User dismissed/cancelled Stripe checkout - not activating');
      }
      return;
    }
    
    // Option 2: Create checkout session via Cloud Function (recommended)
    if (extra.STRIPE_PUBLISHABLE_KEY) {
      console.log('Creating Stripe Checkout session via Cloud Function');
      
      if (Platform.OS === 'web') {
        // Web: Use Firebase Functions SDK
        const { httpsCallable } = await import('firebase/functions');
        const { initializeFirebase } = await import('./firebase-config');
        const { app } = await initializeFirebase();
        const { getFunctions } = await import('firebase/functions');
        const functions = getFunctions(app);
        
        const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
        
        // Add timeout for cloud function call
        const sessionPromise = createSession({ userId: uid });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Cloud function timeout - checkout session creation took too long')), 10000);
        });
        
        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (data?.url) {
          console.log('Opening Stripe Checkout session');
          const result = await WebBrowser.openBrowserAsync(data.url);
          // Do NOT auto-activate on dismiss - wait for webhook
          if (result.type === 'dismiss' || result.type === 'cancel') {
            console.log('User dismissed/cancelled Stripe checkout - not activating');
          }
        } else {
          throw new Error('No checkout URL returned from server');
        }
      } else {
        // Mobile: Use React Native Firebase Functions
        try {
          const functions = (await import('@react-native-firebase/functions')).default;
          
          const createSession = functions().httpsCallable('createStripeCheckoutSession');
          
          // Add timeout for cloud function call
          const sessionPromise = createSession({ userId: uid });
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Cloud function timeout - checkout session creation took too long')), 10000);
          });
          
          const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          
          if (data?.url) {
            console.log('Opening Stripe Checkout session');
            const result = await WebBrowser.openBrowserAsync(data.url);
            // Do NOT auto-activate on dismiss - wait for webhook
            if (result.type === 'dismiss' || result.type === 'cancel') {
              console.log('User dismissed/cancelled Stripe checkout - not activating');
            }
          } else {
            throw new Error('No checkout URL returned from server');
          }
        } catch (importError: any) {
          // If @react-native-firebase/functions is not available in the build,
          // throw error instead of auto-activating
          console.error('@react-native-firebase/functions not available in this build:', importError?.message);
          throw new Error('Stripe integration not available. Please rebuild the app with proper Firebase configuration.');
        }
      }
      return;
    }
    
    // Only use mock activation as absolute fallback (should not normally reach here)
    console.warn('No Stripe configuration found - this should not happen in production');
    throw new Error('Payment system not configured. Please contact support.');
    
  } catch (error) {
    console.error('Purchase flow error:', error);
    // DO NOT fallback to mock activation on error - let it fail properly
    throw error;
  }
}

