// src/screens/WelcomeScreen.tsx
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Circle, Stop } from "react-native-svg";

import CosmicBackground from "../components/magic/CosmicBackground";
import GlowButton from "../components/magic/GlowButton";
import { useSvgId } from "../components/magic/useSvgId";
import { colors, fonts, type } from "../theme";

const oracle = require("../../assets/images/hooded_oracle.png");
// Where the crystal ball sits in the artwork (fractions of the image size).
const ORB = { x: 0.5, y: 0.565 };

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const fadeId = useSvgId("heroFade");
  const orbId = useSvgId("orb");

  const artW = Math.min(width * 1.05, 560);
  const artH = artW * 1.5;
  const artTop = Math.min(-artH * 0.06 + insets.top, height * 0.02);

  const breathe = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion]);

  // Mid plane drifts against the far plane for a slow parallax.
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.035 }, { translateY: breathe.value * 6 }],
  }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.92 + pulse.value * 0.16 }],
  }));

  const orbSize = artW * 0.6;

  return (
    <CosmicBackground image={oracle} imageOpacity={0.45}>
      <View style={styles.artClip} pointerEvents="none">
        <Animated.View entering={FadeIn.duration(1400)} style={[styles.art, { width: artW, height: artH, top: artTop }, artStyle]}>
          <Image source={oracle} style={{ width: artW, height: artH }} resizeMode="cover" />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.orb,
              { width: orbSize, height: orbSize, left: artW * ORB.x - orbSize / 2, top: artH * ORB.y - orbSize / 2 },
              orbStyle,
            ]}
          >
            <Svg width={orbSize} height={orbSize}>
              <Defs>
                <RadialGradient id={orbId} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#cfe0ff" stopOpacity="0.55" />
                  <Stop offset="0.35" stopColor={colors.moon} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={colors.moon} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={orbSize / 2} cy={orbSize / 2} r={orbSize / 2} fill={`url(#${orbId})`} />
            </Svg>
          </Animated.View>

          {/* melt the bottom of the artwork into the night */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
            <Defs>
              <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.5" stopColor={colors.night} stopOpacity="0" />
                <Stop offset="0.82" stopColor={colors.night} stopOpacity="0.92" />
                <Stop offset="1" stopColor={colors.night} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
          </Svg>
        </Animated.View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 36 }]}>
        <Animated.Text entering={FadeInDown.delay(700).duration(1000)} style={type.hero}>
          Tarot Oracle
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(900).duration(1000)} style={styles.tagline}>
          Ask about love, work, or a decision you're stuck on, and get a reading in seconds.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(1200).duration(900)} style={styles.cta}>
          <GlowButton label="Start a reading" onPress={() => navigation.replace("Login")} />
          <Text style={[type.caption, styles.center]}>Your first reading is free.</Text>
        </Animated.View>
      </View>
    </CosmicBackground>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  artClip: { ...StyleSheet.absoluteFillObject, overflow: "hidden", alignItems: "center" },
  art: { position: "absolute" },
  orb: { position: "absolute" },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    gap: 12,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  center: { textAlign: "center" },
  tagline: { fontFamily: fonts.body, fontSize: 19, lineHeight: 27, color: colors.textMuted },
  cta: { marginTop: 22, gap: 14 },
});
