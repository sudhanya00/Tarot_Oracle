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
  if (isMock() || Platform.OS !== 'web') {
    // Mock mode: always return true for testing
    return mockSubscriptions[uid]?.isActive ?? true;
  }

  // Web only - dynamic import Firebase
  const { doc, getDoc } = await import('firebase/firestore');
  const { initializeFirebase } = await import('./firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return false;

  const ref = doc(db, 'subscriptions', uid);
  const snap = await getDoc(ref);
  const data = snap.data() as Subscription | undefined;
  return !!(data && data.isActive && (!data.expiresAt || data.expiresAt > Date.now()));
}

export async function mockActivate(uid: string): Promise<void> {
  if (isMock() || Platform.OS !== 'web') {
    mockSubscriptions[uid] = { isActive: true, updatedAt: Date.now() };
    return;
  }

  // Web only - dynamic import Firebase
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { initializeFirebase } = await import('./firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return;

  const ref = doc(db, 'subscriptions', uid);
  await setDoc(ref, { isActive: true, updatedAt: serverTimestamp() }, { merge: true });
}

export async function startPurchaseFlow(uid: string): Promise<void> {
  if (isMock()) {
    await mockActivate(uid);
    return;
  }
  // Hosted links optional: put them in .env if you have a server
  const extra = (await import('./env')).extra;
  const url = extra.STRIPE_CHECKOUT_URL || extra.STRIPE_PORTAL_URL;
  if (!url) throw new Error('Stripe URLs not configured. Use MODE=mock or provide STRIPE_CHECKOUT_URL / STRIPE_PORTAL_URL.');
  await WebBrowser.openBrowserAsync(url);
}

