import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ExportIcon = ({ size = 16, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M4 17v2c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2H6v-2c0-.55-.45-1-1-1s-1 .45-1 1z"
      />
      <Path
        fill={color}
        d="M11 5.41V15c0 .55.45 1 1 1s1-.45 1-1V5.41l3.29 3.29c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-5-5c-.39-.39-1.02-.39-1.41 0l-5 5c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11 5.41z"
      />
    </Svg>
  );
};

export default ExportIcon;
