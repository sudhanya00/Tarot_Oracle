// Bottom sheet offering the Day Pass ($3 / 24h) and Monthly ($30) plans.
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { formatTimeLeft, PLAN_ORDER, PLANS, PlanId } from '../lib/plans';
import { startPurchaseFlow } from '../lib/subscriptions';
import { colors, fonts, glow, radii, type } from '../theme';
import GlowButton from './magic/GlowButton';
import PressableScale from './magic/PressableScale';
import TarotCard from './magic/TarotCard';

type Props = { visible: boolean; onClose: () => void; reason?: string };

export default function PaywallSheet({ visible, onClose, reason }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { entitlement, refreshAfterPurchase } = useSub();
  const [mounted, setMounted] = useState(visible);
  const [selected, setSelected] = useState<PlanId>('month');
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const backdrop = useSharedValue(0);
  const offset = useSharedValue(600);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setCelebrate(false);
      setSelected(entitlement.active && entitlement.plan === 'day' ? 'day' : 'month');
      backdrop.value = withTiming(1, { duration: 260 });
      offset.value = withSpring(0, { damping: 20, stiffness: 180, mass: 0.9 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 200 });
      offset.value = withTiming(600, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  const monthlyActive = entitlement.active && entitlement.plan === 'month';
  const dayActive = entitlement.active && entitlement.plan === 'day';

  const handlePurchase = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await startPurchaseFlow(user.uid, selected);
      const next = await refreshAfterPurchase();
      if (next.active) {
        setCelebrate(true);
        setTimeout(onClose, 1600);
      } else {
        Alert.alert(
          'Almost there',
          'If you completed payment, your readings will unlock in a moment. Pull back into the app to refresh.'
        );
      }
    } catch (error: any) {
      console.error('PaywallSheet: purchase failed:', error);
      Alert.alert('Payment unavailable', error?.message || 'We could not open checkout. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  const cta =
    selected === 'day'
      ? dayActive
        ? 'Add 24 hours for $3'
        : 'Get 24 hours for $3'
      : 'Subscribe for $30 a month';

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} statusBarTranslucent animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }, sheetStyle]}>
        <View style={styles.handle} />
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <X size={20} color={colors.textMuted} />
        </Pressable>

        {celebrate ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.celebrate}>
            <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.burst}>
              <TarotCard width={84} face="sun" hideLabel />
            </Animated.View>
            <Text style={[type.title, { textAlign: 'center' }]}>You're all set</Text>
            <Text style={[type.caption, { textAlign: 'center' }]}>Unlimited readings are unlocked.</Text>
          </Animated.View>
        ) : (
          <>
            <Text style={[type.title, styles.title]}>{monthlyActive ? "You're on Monthly" : 'Keep reading'}</Text>

            {!monthlyActive && reason && <Text style={type.caption}>{reason}</Text>}

            {dayActive && entitlement.expiresAt && (
              <Text style={[type.caption, styles.status]}>
                Your Day Pass has {formatTimeLeft(entitlement.expiresAt)}.
              </Text>
            )}

            {monthlyActive ? (
              <Text style={type.body}>Unlimited readings until you cancel.</Text>
            ) : (
              <>
                <View style={styles.plans}>
                  {PLAN_ORDER.map((id) => (
                    <PlanOption key={id} id={id} selected={selected === id} onSelect={() => setSelected(id)} />
                  ))}
                </View>
                <GlowButton label={cta} onPress={handlePurchase} loading={busy} />
                <Text style={styles.fine}>
                  The Day Pass is a one-time payment and doesn't renew. Buying another adds 24 hours. Monthly renews
                  until you cancel. Payments are processed by Stripe.
                </Text>
              </>
            )}
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

function PlanOption({ id, selected, onSelect }: { id: PlanId; selected: boolean; onSelect: () => void }) {
  const plan = PLANS[id];
  const lit = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    lit.value = withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected]);

  const ring = useAnimatedStyle(() => ({
    borderColor: `rgba(227, 192, 127, ${0.12 + lit.value * 0.78})`,
    backgroundColor: `rgba(${Math.round(18 + lit.value * 20)}, ${Math.round(22 + lit.value * 10)}, ${Math.round(52 - lit.value * 10)}, 0.75)`,
    shadowOpacity: lit.value * 0.5,
  }));

  return (
    <PressableScale
      onPress={onSelect}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.name}, ${plan.price} ${plan.cadence}`}
    >
      <Animated.View style={[styles.option, glow(colors.gold, 18, 0), ring]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.optionName}>{plan.name}</Text>
          <Text style={type.caption}>{plan.blurb}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.cadence}>{plan.cadence}</Text>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(2, 3, 10, 0.72)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0d22',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairlineGold,
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 14,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairlineGold },
  close: { position: 'absolute', right: 16, top: 16, padding: 8, zIndex: 2 },
  title: { marginTop: 4, paddingRight: 40 },
  status: { color: colors.goldBright },
  plans: { gap: 12 },
  option: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  optionName: { fontFamily: fonts.display, fontSize: 25, color: colors.parchment },
  priceCol: { alignItems: 'flex-end' },
  // Newsreader's lining figures; IM Fell's old-style "0" reads like an "o".
  price: { fontFamily: fonts.bodySemi, fontSize: 30, lineHeight: 36, color: colors.goldBright },
  cadence: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textFaint },
  celebrate: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  burst: { marginBottom: 8 },
});
