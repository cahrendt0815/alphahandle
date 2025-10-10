import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

const ExternalLinkIcon = ({ size = 14, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <G fill="none" fillRule="evenodd" stroke="none" strokeWidth="1" transform="translate(112 112)">
        <Path fill={color} d="M711.111 800H88.89C39.8 800 0 760.2 0 711.111V88.89C0 39.8 39.8 0 88.889 0H711.11C760.2 0 800 39.8 800 88.889V711.11C800 760.2 760.2 800 711.111 800"/>
        <Path fill="#FFF" fillRule="nonzero" d="M628 623H484.942L174 179h143.058zm-126.012-37.651h56.96L300.013 216.65h-56.96z"/>
        <Path fill="#FFF" fillRule="nonzero" d="M219.296885 623 379 437.732409 358.114212 410 174 623z"/>
        <Path fill="#FFF" fillRule="nonzero" d="M409 348.387347 429.212986 377 603 177 558.330417 177z"/>
      </G>
    </Svg>
  );
};

export default ExternalLinkIcon;
