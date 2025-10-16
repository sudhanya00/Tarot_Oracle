import React from "react";
import { View } from "react-native";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const Card: React.FC<Props> = ({ children, className }) => (
  <View className={`rounded-2xl border border-[#e5b80c] bg-transparent ${className || ""}`}>
    {children}
  </View>
);

export const CardContent: React.FC<Props> = ({ children, className }) => (
  <View className={`p-4 ${className || ""}`}>{children}</View>
);

export default Card;
