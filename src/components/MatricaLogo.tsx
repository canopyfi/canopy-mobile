import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface MatricaLogoProps {
  size?: number;
  color?: string;
}

export default function MatricaLogo({ size = 24, color = '#4A99BF' }: MatricaLogoProps) {
  return (
    <Svg width={size} height={(size * 25) / 24} viewBox="0 0 24 25" fill="none">
      <Path d="M15.4275 9.42065H8.57031V16.2778H15.4275V9.42065Z" fill={color} />
      <Path
        d="M9.71431 0.849609V3.99247H3.14286V21.7068H9.71431V24.8496H0V0.849609H9.71431Z"
        fill={color}
      />
      <Path
        d="M14.2856 24.8496H23.9998V0.849609H14.2856V3.99247H20.857V21.7068H14.2856V24.8496Z"
        fill={color}
      />
    </Svg>
  );
}
