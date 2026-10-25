// Three small cards shuffle over one another while the reply is on its way.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../../theme';
import TarotCard from './TarotCard';

const CARD_W = 22;

function ShufflingCard({ index }: { index: number }) {
  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(
      index * 220,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 520, easing: Easing.in(Easing.cubic) }),
          withTiming(0, { duration: 300 })
        ),
        -1
      )
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (index - 1) * 9 + t.value * 10 },
      { translateY: -t.value * 8 },
      { rotateZ: `${(index - 1) * 10 + t.value * 14}deg` },
    ],
    zIndex: Math.round(t.value * 10),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <TarotCard width={CARD_W} />
    </Animated.View>
  );
}

function PulsingLabel() {
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[styles.label, style]}>Shuffling the deck</Animated.Text>;
}

export default function OracleThinking() {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel="Shuffling the deck">
      <View style={styles.deck}>
        {[0, 1, 2].map((i) => (
          <ShufflingCard key={i} index={i} />
        ))}
      </View>
      <PulsingLabel />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  deck: { width: 56, height: 46 },
  label: { fontFamily: fonts.body, fontSize: 17, color: colors.gold },
});
