import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthProvider';
import { Entitlement, getEntitlement, NO_ENTITLEMENT } from '../lib/subscriptions';

type Ctx = {
  canChat: boolean;
  entitlement: Entitlement;
  refresh: () => Promise<Entitlement>;
  // Polls briefly after checkout, since access lands when Stripe's webhook does.
  refreshAfterPurchase: () => Promise<Entitlement>;
};

const SubCtx = createContext<Ctx>({
  canChat: false,
  entitlement: NO_ENTITLEMENT,
  refresh: async () => NO_ENTITLEMENT,
  refreshAfterPurchase: async () => NO_ENTITLEMENT,
});
export const useSub = () => useContext(SubCtx);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>(NO_ENTITLEMENT);

  const refresh = useCallback(async (retries = 3): Promise<Entitlement> => {
    if (!user) {
      setEntitlement(NO_ENTITLEMENT);
      return NO_ENTITLEMENT;
    }

    try {
      const next = await getEntitlement(user.uid);
      console.log('Subscription check result:', next);
      setEntitlement(next);
      return next;
    } catch (error: any) {
      console.error('Error checking subscription:', error?.message || error);

      // Retry on transient errors
      if (retries > 0 && (error?.code === 'firestore/unavailable' || error?.message?.includes('unavailable'))) {
        console.log(`Retrying subscription check... (${retries} attempts left)`);
        await wait(1500);
        return refresh(retries - 1);
      }

      // On persistent error, default to not subscribed (allows first free message)
      setEntitlement(NO_ENTITLEMENT);
      return NO_ENTITLEMENT;
    }
  }, [user?.uid]);

  const refreshAfterPurchase = useCallback(async () => {
    let latest = await refresh();
    for (let attempt = 0; attempt < 8 && !latest.active; attempt++) {
      await wait(2500);
      latest = await refresh();
    }
    return latest;
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      setEntitlement(NO_ENTITLEMENT);
      return;
    }
    // Delay to let Firebase initialize properly
    const timer = setTimeout(() => {
      console.log('Starting subscription check for user:', user.uid);
      refresh();
    }, 1000);
    return () => clearTimeout(timer);
  }, [user?.uid]);

  // Lock the chat the moment a Day Pass (or lapsed plan) runs out.
  useEffect(() => {
    if (!entitlement.active || !entitlement.expiresAt) return;
    const msLeft = entitlement.expiresAt - Date.now();
    // setTimeout overflows past ~24.8 days; long plans get re-checked on resume instead.
    if (msLeft > 2 ** 31 - 1) return;
    const timer = setTimeout(() => refresh(), Math.max(0, msLeft) + 1000);
    return () => clearTimeout(timer);
  }, [entitlement.active, entitlement.expiresAt, refresh]);

  // Re-check when the app returns to the foreground (e.g. back from Stripe Checkout).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) refresh();
    });
    return () => sub.remove();
  }, [user?.uid, refresh]);

  return (
    <SubCtx.Provider value={{ canChat: entitlement.active, entitlement, refresh, refreshAfterPurchase }}>
      {children}
    </SubCtx.Provider>
  );
}
