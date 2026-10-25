import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, radii } from '../../theme';

type Props = TextInputProps & { icon?: React.ReactNode };

// Text field whose edge warms to gold and glows while focused.
const GlowInput = forwardRef<TextInput, Props>(({ icon, style, onFocus, onBlur, ...rest }, ref) => {
  const [focused, setFocused] = useState(false);
  const lit = useDerivedValue(() => withTiming(focused ? 1 : 0, { duration: 220 }), [focused]);

  const frame = useAnimatedStyle(() => ({
    borderColor: `rgba(227, 192, 127, ${0.14 + lit.value * 0.66})`,
    shadowOpacity: lit.value * 0.45,
    backgroundColor: `rgba(10, 13, 34, ${0.55 + lit.value * 0.25})`,
  }));

  return (
    <Animated.View style={[styles.frame, frame]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.gold}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, style]}
      />
    </Animated.View>
  );
});

export default GlowInput;

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    shadowColor: colors.gold,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    // Remove the default focus ring on web; the frame glows instead.
    outlineStyle: 'none',
  } as any,
});
