import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function ChevronIcon({ direction = 'up', color = '#697386', size = 12 }) {
  const rotation = direction === 'down' ? 180 : 0;

  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }}>
      <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
        <Path
          d="M2 8L6 4L10 8"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
