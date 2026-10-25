// Layered night sky with a depth-of-field feel: a heavily blurred, slowly drifting far plane,
// crisp twinkling stars, and large out-of-focus bokeh orbs floating in the near plane.
import React, { useEffect, useMemo } from 'react';
import { Image, ImageSourcePropType, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../theme';
import { seeded, useSvgId } from './useSvgId';

type Props = {
  image?: ImageSourcePropType;
  imageOpacity?: number;
  // How much of the sky is lit: fewer stars and bokeh on busy screens like chat.
  density?: 'calm' | 'rich';
  children?: React.ReactNode;
};

export default function CosmicBackground({ image, imageOpacity = 0.55, density = 'rich', children }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const skyId = useSvgId('sky');
  const moonId = useSvgId('moonglow');
  const emberId = useSvgId('ember');
  const vignetteId = useSvgId('vignette');

  const starCount = density === 'rich' ? 42 : 24;
  const bokehCount = density === 'rich' ? 7 : 4;

  const stars = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: starCount }, () => ({
      x: rand() * width,
      y: rand() * height,
      size: 1 + rand() * 2.2,
      delay: rand() * 4000,
      duration: 1800 + rand() * 2600,
      gold: rand() > 0.82,
    }));
  }, [width, height, starCount]);

  const bokeh = useMemo(() => {
    const rand = seeded(21);
    return Array.from({ length: bokehCount }, (_, i) => ({
      x: rand() * width - 60,
      y: rand() * height - 60,
      size: 90 + rand() * 170,
      drift: 18 + rand() * 30,
      duration: 9000 + rand() * 9000,
      color: i % 3 === 0 ? colors.gold : colors.moon,
      opacity: 0.08 + rand() * 0.12,
    }));
  }, [width, height, bokehCount]);

  return (
    <View style={styles.fill}>
      {/* Decorative layers live in their own clipped layer with nothing focusable, so focus
          changes in the content can never scroll the oversized art sideways (seen on web). */}
      <View style={styles.layer} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.indigo} />
              <Stop offset="0.45" stopColor={colors.midnight} />
              <Stop offset="1" stopColor={colors.night} />
            </LinearGradient>
            <RadialGradient id={moonId} cx="50%" cy="8%" r="70%">
              <Stop offset="0" stopColor={colors.moon} stopOpacity="0.22" />
              <Stop offset="1" stopColor={colors.moon} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={emberId} cx="85%" cy="100%" r="60%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity="0.1" />
              <Stop offset="1" stopColor={colors.gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${skyId})`} />
          <Rect width="100%" height="100%" fill={`url(#${moonId})`} />
          <Rect width="100%" height="100%" fill={`url(#${emberId})`} />
        </Svg>

        {image ? <FarPlane image={image} opacity={imageOpacity} animate={!reduceMotion} /> : null}

        {stars.map((s, i) => (
          <Star key={`s${i}`} {...s} animate={!reduceMotion} />
        ))}

        {bokeh.map((b, i) => (
          <Bokeh key={`b${i}`} {...b} animate={!reduceMotion} />
        ))}

        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id={vignetteId} cx="50%" cy="45%" r="75%">
              <Stop offset="0.55" stopColor={colors.night} stopOpacity="0" />
              <Stop offset="1" stopColor={colors.night} stopOpacity="0.85" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${vignetteId})`} />
        </Svg>
      </View>

      {children}
    </View>
  );
}

// Background artwork, blurred and slowly panned so it reads as distant and out of focus.
function FarPlane({ image, opacity, animate }: { image: ImageSourcePropType; opacity: number; animate: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [animate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1.25 + t.value * 0.06 }, { translateX: -12 + t.value * 24 }, { translateY: t.value * -14 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }, style]} pointerEvents="none">
      <Image source={image} style={styles.image} resizeMode="cover" blurRadius={22} />
    </Animated.View>
  );
}

function Star({ x, y, size, delay, duration, gold, animate }: {
  x: number; y: number; size: number; delay: number; duration: number; gold: boolean; animate: boolean;
}) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!animate) return;
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      )
    );
  }, [animate]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const color = gold ? colors.goldBright : '#ffffff';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: size * 2,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

function Bokeh({ x, y, size, drift, duration, color, opacity, animate }: {
  x: number; y: number; size: number; drift: number; duration: number; color: string; opacity: number; animate: boolean;
}) {
  const id = useSvgId('bokeh');
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [animate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -drift * t.value }, { translateX: drift * 0.4 * t.value }, { scale: 1 + 0.08 * t.value }],
    opacity: opacity * (0.7 + 0.3 * t.value),
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.night },
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
