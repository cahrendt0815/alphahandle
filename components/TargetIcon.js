/**
 * TargetIcon - Custom SVG target/bullseye icon for Hit Ratio metric
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function TargetIcon({ color = '#9AA0A6', size = 20 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Outer circle */}
        <Circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Middle circle */}
        <Circle
          cx="12"
          cy="12"
          r="6"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Inner circle (bullseye) */}
        <Circle
          cx="12"
          cy="12"
          r="2"
          fill={color}
        />
      </Svg>
    </View>
  );
}
