import React from "react";
import { Pressable, Text } from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
};

export const Button: React.FC<Props> = ({ children, onPress, disabled, className }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 bg-blue-700 active:bg-blue-600 ${disabled ? "opacity-50" : ""} ${className || ""}`}
    >
      <Text className="text-white text-base font-semibold">{children}</Text>
    </Pressable>
  );
};

export default Button;
