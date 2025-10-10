import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { sidebarItem } from '../../theme/styles';

export function SidebarItem({
  active,
  icon,
  label,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <View style={[sidebarItem.base, active && sidebarItem.active]}>
      {icon}
      <Text style={[sidebarItem.text, active && sidebarItem.activeText]}>
        {label}
      </Text>
    </View>
  );
}
