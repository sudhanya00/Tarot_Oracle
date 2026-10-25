// Vector tarot card in the app's gold-on-midnight line style, plus a gently floating wrapper.
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, fonts, glow } from '../../theme';
import { useSvgId } from './useSvgId';

export type CardFace = 'back' | 'sun' | 'moon' | 'star';

const LABELS: Record<CardFace, string | null> = { back: null, sun: 'THE SUN', moon: 'THE MOON', star: 'THE STAR' };

type Props = { width: number; face?: CardFace; hideLabel?: boolean; style?: StyleProp<ViewStyle> };

// Eight-pointed star, as drawn on the traditional Star card.
const star8 = (cx: number, cy: number, r: number) => {
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.42;
    return `${cx + Math.cos(a) * d},${cy + Math.sin(a) * d}`;
  });
  return `M${points.join(' L')} Z`;
};

const crescent = (cx: number, cy: number, r: number) =>
  `M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r} A${r * 1.25},${r * 1.25} 0 0 1 ${cx},${cy - r} Z`;

export default function TarotCard({ width, face = 'back', hideLabel, style }: Props) {
  const height = width * 1.62;
  const fillId = useSvgId('cardfill');
  const sheenId = useSvgId('cardsheen');
  const cx = width / 2;
  // Labels get illegible on thumbnail-sized cards.
  const label = width >= 80 && !hideLabel ? LABELS[face] : null;
  const cy = label ? height * 0.44 : height / 2;
  const r = width * 0.2;
  const stroke = colors.gold;
  const sw = Math.max(1, width / 110);

  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const inner = r * 1.18;
    const outer = r * (i % 2 === 0 ? 1.75 : 1.45);
    return { x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner, x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer };
  });

  return (
    <View style={[{ width, height, borderRadius: width * 0.08 }, glow(colors.moon, 26, 0.35), style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.indigoLift} />
            <Stop offset="1" stopColor={colors.midnight} />
          </LinearGradient>
          <LinearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <Stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={width * 0.08} fill={`url(#${fillId})`} stroke={stroke} strokeWidth={sw} />
        <Rect
          x={width * 0.06}
          y={width * 0.06}
          width={width * 0.88}
          height={height - width * 0.12}
          rx={width * 0.05}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.55}
          strokeWidth={sw * 0.7}
        />

        <G stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
          {(face === 'sun' || face === 'back') && rays.map((l, i) => <Line key={i} {...l} strokeOpacity={face === 'back' ? 0.6 : 1} />)}
          {face !== 'star' && <Circle cx={cx} cy={cy} r={r} />}
          {face === 'star' && <Circle cx={cx} cy={cy} r={r * 1.5} strokeOpacity={0.4} />}
        </G>

        {(face === 'back' || face === 'moon') && <Path d={crescent(cx - r * 0.12, cy, r * 0.72)} fill={stroke} fillOpacity={0.9} />}
        {face === 'sun' && <Circle cx={cx} cy={cy} r={r * 0.62} fill={stroke} fillOpacity={0.9} />}
        {face === 'star' && <Path d={star8(cx, cy, r * 1.15)} fill={stroke} />}

        {/* corner pips, like the dots in the constellation artwork */}
        <G fill={stroke}>
          <Circle cx={width * 0.18} cy={width * 0.18} r={width * 0.018} />
          <Circle cx={width * 0.82} cy={width * 0.18} r={width * 0.018} />
          <Circle cx={width * 0.18} cy={height - width * 0.18} r={width * 0.018} />
          <Circle cx={width * 0.82} cy={height - width * 0.18} r={width * 0.018} />
          {face === 'back' && <Circle cx={cx} cy={height * 0.15} r={width * 0.022} />}
          {face === 'back' && <Circle cx={cx} cy={height * 0.85} r={width * 0.022} />}
        </G>

        {/* glossy sheen across the top-left like light catching foil */}
        <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={width * 0.08} fill={`url(#${sheenId})`} />
      </Svg>

      {label && (
        <View style={[styles.labelWrap, { bottom: height * 0.09 }]}>
          <View style={[styles.labelRule, { width: width * 0.62 }]} />
          <Text style={[styles.label, { fontSize: Math.max(9, width * 0.085) }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

type FloatingProps = Props & {
  // Phase offset so several cards don't bob in sync.
  delay?: number;
  tilt?: number;
  amplitude?: number;
};

export function FloatingCard({ delay = 0, tilt = 0, amplitude = 8, style, ...card }: FloatingProps) {
  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { translateY: -amplitude * t.value },
      { rotateZ: `${tilt + t.value * 1.5}deg` },
      { rotateY: `${-6 + t.value * 12}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animated]}>
      <TarotCard {...card} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  labelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  labelRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairlineGold, marginBottom: 6 },
  label: { fontFamily: fonts.display, color: colors.gold, letterSpacing: 1 },
});
