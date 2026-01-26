import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

export default function LockIcon({ color = '#FFFFFF', size = 16 }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <Path
          d="M12 7V5C12 2.79086 10.2091 1 8 1C5.79086 1 4 2.79086 4 5V7"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Rect
          x="3"
          y="7"
          width="10"
          height="7"
          rx="1.5"
          stroke={color}
          strokeWidth="1.5"
        />
        <Circle
          cx="8"
          cy="10.5"
          r="1"
          fill={color}
        />
      </Svg>
    </View>
  );
}
