import React, { ReactNode } from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { card } from '../../theme/styles';

type Props = {
  title?: ReactNode;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export default function Card({ title, actions, style, children }: Props) {
  return (
    <View style={[card.base, style]}>
      {(title || actions) && (
        <View style={card.headerRow}>
          {title ? <Text style={card.title}>{title}</Text> : <View />}
          {actions}
        </View>
      )}
      {children}
    </View>
  );
}
