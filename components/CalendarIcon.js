import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

const CalendarIcon = ({ size = 16, color = '#6B7C93' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="6"
        width="18"
        height="15"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <Line x1="7" y1="3" x2="7" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="17" y1="3" x2="17" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
};

export default CalendarIcon;
