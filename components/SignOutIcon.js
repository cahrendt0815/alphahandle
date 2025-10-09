/**
 * SignOutIcon - Simple arrow right icon for sign out
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

export default function SignOutIcon({ color = '#697386', size = 16 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Vertical line on left */}
        <Line
          x1="3"
          y1="4"
          x2="3"
          y2="20"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Arrow line */}
        <Line
          x1="8"
          y1="12"
          x2="21"
          y2="12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Arrow head - top part */}
        <Path
          d="M17 8 L21 12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow head - bottom part */}
        <Path
          d="M17 16 L21 12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
