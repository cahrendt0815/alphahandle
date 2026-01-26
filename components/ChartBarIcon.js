/**
 * ChartBarIcon - Custom SVG bar chart icon for Alpha metric
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export default function ChartBarIcon({ color = '#9AA0A6', size = 20 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Bar 1 */}
        <Rect
          x="3"
          y="12"
          width="4"
          height="9"
          rx="1"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Bar 2 */}
        <Rect
          x="10"
          y="8"
          width="4"
          height="13"
          rx="1"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Bar 3 */}
        <Rect
          x="17"
          y="3"
          width="4"
          height="18"
          rx="1"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </View>
  );
}
