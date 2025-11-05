/**
 * AlphaHandleLogo Component - SVG version
 * The ALPHAHANDLE logo with the distinctive alpha symbol
 */

import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { View, TouchableOpacity } from 'react-native';

export default function AlphaHandleLogo({ size = 'medium', onPress }) {
  const sizes = {
    small: { height: 32, width: 200, scale: 0.8 },
    medium: { height: 40, width: 250, scale: 1 },
    large: { height: 50, width: 312, scale: 1.25 },
  };

  const currentSize = sizes[size] || sizes.medium;
  const scale = currentSize.scale;

  const logoSvg = (
    <View style={{ width: currentSize.width, height: currentSize.height }}>
      <Svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox="0 0 900 160"
        preserveAspectRatio="xMinYMid meet"
      >
        {/* Alpha symbol - circle with slanted cutout */}
        <G transform={`scale(${scale})`}>
          {/* Outer circle background */}
          <Path
            d="M 60 20 A 50 50 0 1 1 60 120 A 50 50 0 1 1 60 20 Z"
            fill="#6366F1"
          />
          {/* Inner cutout creating alpha symbol */}
          <Path
            d="M 50 40 L 90 40 L 90 100 L 50 100 Z"
            fill="#FFFFFF"
          />
          <Path
            d="M 40 50 L 70 80 L 50 100 Z"
            fill="#6366F1"
          />
        </G>

        {/* ALPHAHANDLE text */}
        <G transform={`translate(120, 70) scale(${scale})`}>
          {/* A */}
          <Path d="M 0 0 L 12 -40 L 24 0 M 6 -16 L 18 -16" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* L */}
          <Path d="M 36 -40 L 36 0 L 52 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* P */}
          <Path d="M 64 0 L 64 -40 L 76 -40 A 10 10 0 0 1 76 -20 L 64 -20" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* H */}
          <Path d="M 88 -40 L 88 0 M 88 -20 L 104 -20 M 104 -40 L 104 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* A */}
          <Path d="M 116 0 L 128 -40 L 140 0 M 122 -16 L 134 -16" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* H */}
          <Path d="M 152 -40 L 152 0 M 152 -20 L 168 -20 M 168 -40 L 168 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* A */}
          <Path d="M 180 0 L 192 -40 L 204 0 M 186 -16 L 198 -16" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* N */}
          <Path d="M 216 0 L 216 -40 L 232 0 L 232 -40" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* D */}
          <Path d="M 244 0 L 244 -40 L 256 -40 A 20 20 0 0 1 256 0 L 244 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* L */}
          <Path d="M 268 -40 L 268 0 L 284 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* E */}
          <Path d="M 296 0 L 296 -40 L 312 -40 M 296 -20 L 308 -20 M 296 0 L 312 0" stroke="#1E293B" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {logoSvg}
      </TouchableOpacity>
    );
  }

  return logoSvg;
}
