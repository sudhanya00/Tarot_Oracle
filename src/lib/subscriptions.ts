import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { isMock } from './env';
import type { PlanId } from './plans';

const DAY_PASS_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_PASS_MS;

// Shape of subscriptions/{uid}, written only by the Stripe webhook (see functions/src/index.ts).
export type Subscription = {
  isActive: boolean;
  expiresAt?: number; // ms epoch; missing on legacy docs, which never expire
  plan?: PlanId | null;
  dayPassExpiresAt?: number;
  monthlyActive?: boolean;
  status?: string;
  updatedAt?: any;
};

export type Entitlement = {
  active: boolean;
  plan: PlanId | null;
  expiresAt: number | null;
};

export const NO_ENTITLEMENT: Entitlement = { active: false, plan: null, expiresAt: null };

// Mock-mode store so the paywall and both plans can be exercised without Stripe.
const mockSubscriptions: Record<string, Subscription> = {};

function toEntitlement(data: Subscription | undefined): Entitlement {
  if (!data?.isActive) return NO_ENTITLEMENT;
  const expiresAt = data.expiresAt || null;
  if (expiresAt && expiresAt <= Date.now()) return NO_ENTITLEMENT;
  return { active: true, plan: data.plan ?? (expiresAt ? null : 'month'), expiresAt };
}

export async function getEntitlement(uid: string): Promise<Entitlement> {
  if (isMock()) {
    return toEntitlement(mockSubscriptions[uid]);
  }

  try {
    if (Platform.OS === 'web') {
      const { doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebase } = await import('./firebase-config');
      const { db } = await initializeFirebase();
      if (!db) return NO_ENTITLEMENT;

      const snap = await getDoc(doc(db, 'subscriptions', uid));
      return toEntitlement(snap.data() as Subscription | undefined);
    }

    const firestore = (await import('@react-native-firebase/firestore')).default;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore query timeout')), 5000);
    });
    const snap = (await Promise.race([
      firestore().collection('subscriptions').doc(uid).get(),
      timeoutPromise,
    ])) as any;
    return toEntitlement(snap.exists ? (snap.data() as Subscription) : undefined);
  } catch (error: any) {
    console.error('getEntitlement: ERROR:', error?.message || error);
    const enhancedError: any = new Error(`Subscription check failed: ${error?.message || 'Unknown error'}`);
    enhancedError.code = error?.code || 'firestore/error';
    throw enhancedError;
  }
}

export async function checkSubscription(uid: string): Promise<boolean> {
  return (await getEntitlement(uid)).active;
}

// Mock only: grants the plan locally the same way the webhook would (Day Passes stack).
export async function mockActivate(uid: string, plan: PlanId): Promise<void> {
  const current = mockSubscriptions[uid];
  const now = Date.now();
  if (plan === 'day') {
    const base = Math.max(now, current?.dayPassExpiresAt || 0);
    const dayPassExpiresAt = base + DAY_PASS_MS;
    const expiresAt = Math.max(dayPassExpiresAt, current?.monthlyActive ? current.expiresAt || 0 : 0);
    mockSubscriptions[uid] = {
      ...current,
      isActive: true,
      dayPassExpiresAt,
      expiresAt,
      plan: current?.monthlyActive ? 'month' : 'day',
    };
  } else {
    mockSubscriptions[uid] = {
      ...current,
      isActive: true,
      monthlyActive: true,
      expiresAt: Math.max(now + MONTH_MS, current?.dayPassExpiresAt || 0),
      plan: 'month',
    };
  }
  console.log('mockActivate: granted', plan, 'to', uid);
}

// Opens Stripe Checkout for the chosen plan. Access is granted by the webhook once
// payment succeeds, so callers should refresh the entitlement after this resolves.
export async function startPurchaseFlow(uid: string, plan: PlanId): Promise<void> {
  console.log('startPurchaseFlow:', plan, 'for user:', uid);

  if (isMock()) {
    await mockActivate(uid, plan);
    return;
  }

  let data: { url?: string } | undefined;
  if (Platform.OS === 'web') {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { initializeFirebase } = await import('./firebase-config');
    const { app } = await initializeFirebase();
    const createSession = httpsCallable(getFunctions(app), 'createStripeCheckoutSession');
    data = (await createSession({ plan })).data as any;
  } else {
    const functions = (await import('@react-native-firebase/functions')).default;
    const createSession = functions().httpsCallable('createStripeCheckoutSession');
    data = (await createSession({ plan })).data as any;
  }

  if (!data?.url) {
    throw new Error('No checkout URL returned from server');
  }
  await WebBrowser.openBrowserAsync(data.url);
}
