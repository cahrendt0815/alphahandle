/**
 * TrendingUpIcon - Custom SVG trending up icon for Return metric
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

export default function TrendingUpIcon({ color = '#9AA0A6', size = 20 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Trending line */}
        <Polyline
          points="23 6 13.5 15.5 8.5 10.5 1 18"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Arrow head */}
        <Polyline
          points="17 6 23 6 23 12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
