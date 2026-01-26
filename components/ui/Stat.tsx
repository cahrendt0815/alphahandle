import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { stat } from '../../theme/styles';

export function Stat({
  icon,
  label,
  value,
  trend,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <View style={stat.tile}>
      <View style={stat.iconWrap}>{icon}</View>
      <View>
        <Text style={stat.label}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={stat.value}>{value}</Text>
          {trend ? <Text style={stat.trend}>{trend}</Text> : null}
        </View>
      </View>
    </View>
  );
}
