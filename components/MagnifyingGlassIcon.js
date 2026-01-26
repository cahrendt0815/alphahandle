/**
 * MagnifyingGlassIcon - Custom SVG magnifying glass icon
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

export default function MagnifyingGlassIcon({ color = '#697386', size = 16 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Circle lens */}
        <Circle
          cx="10"
          cy="10"
          r="7"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Handle */}
        <Line
          x1="15.5"
          y1="15.5"
          x2="21"
          y2="21"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
