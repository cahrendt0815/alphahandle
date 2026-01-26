import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { toolbar } from '../../theme/styles';

export function Toolbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={toolbar.bar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {left}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {right}
      </View>
    </View>
  );
}
