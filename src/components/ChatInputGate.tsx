import React from 'react';
import { View } from 'react-native';
import SubscribeButton from './SubscribeButton';
import { useSub } from '../context/SubscriptionProvider';

type Props = {
  hasFirstAssistantReply: boolean;
  renderInput: () => React.ReactElement; // your existing input (unchanged style)
};

export default function ChatInputGate({ hasFirstAssistantReply, renderInput }: Props) {
  const { canChat } = useSub();

  if (!canChat) return <SubscribeButton />;

  // first chat free: input until after assistant replies once
  if (hasFirstAssistantReply) return <SubscribeButton />;

  return <View>{renderInput()}</View>;
}
