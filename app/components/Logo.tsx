import React from 'react';
import { Image } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export function Logo({ width = 300, height = 120 }: LogoProps) {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
