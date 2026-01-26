import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';

const EmptyStateIcon = ({ width = 280, height = 200 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
      {/* Background card 1 */}
      <G opacity="0.4">
        <Path
          d="M20 20 L240 20 C245.5 20 250 24.5 250 30 L250 60 C250 65.5 245.5 70 240 70 L20 70 C14.5 70 10 65.5 10 60 L10 30 C10 24.5 14.5 20 20 20 Z"
          fill="#E8E8F5"
        />
        <Circle cx="35" cy="45" r="15" fill="#C4C4E8" />
        <Path d="M65 35 L220 35 L220 40 L65 40 Z" fill="#C4C4E8" />
        <Path d="M65 50 L180 50 L180 55 L65 55 Z" fill="#C4C4E8" />
      </G>

      {/* Background card 2 */}
      <G opacity="0.6">
        <Path
          d="M25 60 L245 60 C250.5 60 255 64.5 255 70 L255 100 C255 105.5 250.5 110 245 110 L25 110 C19.5 110 15 105.5 15 100 L15 70 C15 64.5 19.5 60 25 60 Z"
          fill="#D5D5EB"
        />
        <Circle cx="40" cy="85" r="15" fill="#AFAFD5" />
        <Path d="M70 75 L230 75 L230 80 L70 80 Z" fill="#AFAFD5" />
        <Path d="M70 90 L190 90 L190 95 L70 95 Z" fill="#AFAFD5" />
      </G>

      {/* Front card */}
      <Path
        d="M30 100 L250 100 C255.5 100 260 104.5 260 110 L260 140 C260 145.5 255.5 150 250 150 L30 150 C24.5 150 20 145.5 20 140 L20 110 C20 104.5 24.5 100 30 100 Z"
        fill="#E8E8F5"
      />
      <Circle cx="45" cy="125" r="15" fill="#9B9BD5" />
      <Path d="M75 115 L240 115 L240 120 L75 120 Z" fill="#9B9BD5" />
      <Path d="M75 130 L200 130 L200 135 L75 135 Z" fill="#9B9BD5" />

      {/* Search icon circle */}
      <Circle cx="210" cy="120" r="45" fill="#8B8BDB" opacity="0.9" />
      <G transform="translate(190, 100)">
        {/* Magnifying glass */}
        <Circle
          cx="20"
          cy="20"
          r="12"
          stroke="#FFFFFF"
          strokeWidth="3"
          fill="none"
        />
        <Path
          d="M 29 29 L 38 38"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

export default EmptyStateIcon;
