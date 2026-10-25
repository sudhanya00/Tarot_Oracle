// Header pill showing what the user has: Monthly, Day Pass countdown, or an invitation to unlock.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSub } from '../context/SubscriptionProvider';
import { formatTimeLeft } from '../lib/plans';
import { colors, fonts, radii } from '../theme';
import PressableScale from './magic/PressableScale';

export default function PlanPill({ onPress }: { onPress: () => void }) {
  const { entitlement } = useSub();
  const [, tick] = useState(0);

  // Keep the Day Pass countdown fresh.
  useEffect(() => {
    if (entitlement.plan !== 'day') return;
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [entitlement.plan]);

  let label = 'Plans';
  if (entitlement.active && entitlement.plan === 'month') label = 'Monthly';
  else if (entitlement.active && entitlement.expiresAt) label = formatTimeLeft(entitlement.expiresAt);
  else if (entitlement.active) label = 'Unlimited';

  const unlocked = entitlement.active;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unlocked ? `Your plan: ${label}` : 'See plans'}
      style={[styles.pill, unlocked ? styles.active : styles.locked]}
    >
      <Text style={[styles.text, { color: unlocked ? colors.night : colors.gold }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  locked: { borderWidth: 1, borderColor: colors.hairlineGold, backgroundColor: colors.goldSoft },
  active: { backgroundColor: colors.gold },
  text: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
