/**
 * MiniChart - Small sparkline chart component for table rows
 * Google Finance style
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

const MiniChart = ({ data = [], width = 80, height = 40, stockReturn = 0 }) => {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  // Find min and max values for scaling
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Create points for the line
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Create points for the area fill (add bottom corners)
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  // Determine color based on return value (positive = green, negative/zero = red)
  const isPositive = stockReturn > 0;
  const lineColor = isPositive ? '#1E8E3E' : '#D93025';
  const gradientStart = isPositive ? 'rgba(30, 142, 62, 0.2)' : 'rgba(217, 48, 37, 0.2)';
  const gradientEnd = isPositive ? 'rgba(30, 142, 62, 0.02)' : 'rgba(217, 48, 37, 0.02)';

  // Generate unique gradient ID for each chart instance
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={gradientStart} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
        />
      </Svg>
    </View>
  );
};

export default MiniChart;
