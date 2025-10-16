import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { checkSubscription } from '../lib/subscriptions';

type Ctx = { canChat: boolean; refresh: () => Promise<void> };
const SubCtx = createContext<Ctx>({ canChat: false, refresh: async () => {} });
export const useSub = () => useContext(SubCtx);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [canChat, setCanChat] = useState(false);

  const refresh = async () => {
    if (!user) { setCanChat(false); return; }
    setCanChat(await checkSubscription(user.uid));
  };

  useEffect(() => {
    refresh();
  }, [user?.uid]);

  return (
    <SubCtx.Provider value={{ canChat, refresh }}>
      {children}
    </SubCtx.Provider>
  );
}
