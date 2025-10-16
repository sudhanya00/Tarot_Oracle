import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { startPurchaseFlow } from '../lib/subscriptions';
import { useSub } from '../context/SubscriptionProvider';

export default function SubscribeButton() {
  const { user } = useAuth();
  const { refresh } = useSub();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={async () => {
        if (!user) return;
        await startPurchaseFlow(user.uid);
        await refresh();
      }}
      style={{ paddingVertical: 12, alignItems: 'center' }}
    >
      <Text>Subscribe 🔮</Text>
    </TouchableOpacity>
  );
}
