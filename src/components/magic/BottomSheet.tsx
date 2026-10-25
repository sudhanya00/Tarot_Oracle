// Modal sheet that springs up from the bottom over a dimmed backdrop.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors } from '../../theme';

type Props = { visible: boolean; onClose: () => void; children: React.ReactNode };

export default function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const backdrop = useSharedValue(0);
  const offset = useSharedValue(600);

  useEffect(() => {
    if (visible) {
      setMounted(true);
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

  if (!mounted) return null;

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
        {children}
      </Animated.View>
    </Modal>
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
});
