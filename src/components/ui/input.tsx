import React from "react";
import { TextInput, TextInputProps } from "react-native";

type Props = TextInputProps & { className?: string };

export const Input: React.FC<Props> = ({ className, ...rest }) => {
  return (
    <TextInput
      className={`rounded-2xl px-4 py-3 bg-[#0d1423] text-blue-200 ${className || ""}`}
      placeholderTextColor="#7aa0c4"
      {...rest}
    />
  );
};

export default Input;
