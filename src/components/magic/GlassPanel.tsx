import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'strong' | 'gold';
};

// Frosted panel: translucent fill, hairline edge and a lit top rim.
export default function GlassPanel({ children, style, tone = 'default' }: Props) {
  return (
    <View
      style={[
        styles.panel,
        tone === 'strong' && { backgroundColor: colors.glassStrong },
        tone === 'gold' && { borderColor: colors.hairlineGold, backgroundColor: 'rgba(30, 26, 40, 0.6)' },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.rim, tone === 'gold' && { backgroundColor: 'rgba(246, 223, 168, 0.35)' }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
    // Real backdrop blur where the platform supports it.
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any) : null),
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
