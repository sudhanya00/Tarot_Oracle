import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { checkSubscription } from '../lib/subscriptions';

type Ctx = { canChat: boolean; refresh: () => Promise<void> };
const SubCtx = createContext<Ctx>({ canChat: false, refresh: async () => {} });
export const useSub = () => useContext(SubCtx);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [canChat, setCanChat] = useState(false);

  const refresh = async (retries = 3) => {
    if (!user) { 
      setCanChat(false); 
      return; 
    }
    
    try {
      const isSubscribed = await checkSubscription(user.uid);
      console.log('Subscription check result:', isSubscribed);
      setCanChat(isSubscribed);
    } catch (error: any) {
      console.error('Error checking subscription:', error?.message || error);
      
      // Retry on transient errors
      if (retries > 0 && (error?.code === 'firestore/unavailable' || error?.message?.includes('unavailable'))) {
        console.log(`Retrying subscription check... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
        return refresh(retries - 1);
      }
      
      // On persistent error, default to not subscribed (allows first free message)
      console.log('Could not verify subscription, defaulting to free message mode');
      setCanChat(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Delay to let Firebase initialize properly
      const timer = setTimeout(() => {
        console.log('Starting subscription check for user:', user.uid);
        refresh();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setCanChat(false);
    }
  }, [user?.uid]);

  return (
    <SubCtx.Provider value={{ canChat, refresh }}>
      {children}
    </SubCtx.Provider>
  );
}
