// Primary call-to-action: a gilded button with a slow light sweep, or a quiet glass variant.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts, glow, radii } from '../../theme';
import PressableScale from './PressableScale';
import { useSvgId } from './useSvgId';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'gold' | 'glass';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const SWEEP_WIDTH = 70;

export default function GlowButton({
  label,
  onPress,
  variant = 'gold',
  icon,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: Props) {
  const gradientId = useSvgId('btn');
  const sweepId = useSvgId('sweep');
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);
  const gold = variant === 'gold';

  useEffect(() => {
    if (!gold || reduceMotion || disabled) return;
    sweep.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(1400, withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }))
      ),
      -1
    );
  }, [gold, reduceMotion, disabled]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SWEEP_WIDTH + sweep.value * (width + SWEEP_WIDTH * 2) }, { skewX: '-20deg' }],
  }));

  const textColor = gold ? colors.night : colors.parchment;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={[
        styles.base,
        gold ? glow(colors.gold, 22, 0.45) : styles.glass,
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      <View style={styles.clip} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {gold && (
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.goldBright} />
                <Stop offset="0.5" stopColor={colors.gold} />
                <Stop offset="1" stopColor={colors.goldDeep} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        )}

        {gold && width > 0 && (
          <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
            <Svg width={SWEEP_WIDTH} height="100%">
              <Defs>
                <LinearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
                  <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${sweepId})`} />
            </Svg>
          </Animated.View>
        )}

        {/* top edge highlight gives the surface a lit, slightly convex feel */}
        <View pointerEvents="none" style={[styles.highlight, !gold && { backgroundColor: 'rgba(255,255,255,0.07)' }]} />

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <>
              {icon}
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, minHeight: 54 },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairlineGold,
  },
  clip: { flex: 1, borderRadius: radii.pill, overflow: 'hidden', justifyContent: 'center' },
  sweep: { position: 'absolute', top: 0, bottom: 0, left: 0, width: SWEEP_WIDTH },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 26,
    paddingVertical: 16,
  },
  label: { fontFamily: fonts.bodySemi, fontSize: 18 },
});
