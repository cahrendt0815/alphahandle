/**
 * AlphaLogo Component
 * Displays the Alphahandle logo
 */

import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function AlphaLogo({ size = 'medium', onPress }) {
  const sizes = {
    small: { height: 40, width: 148 },
    medium: { height: 50, width: 185 },
    large: { height: 60, width: 222 },
  };

  const currentSize = sizes[size] || sizes.medium;

  const logoImage = (
    <Image
      source={require('../assets/logos/alphahandle_logo-removebg-preview.png')}
      style={{
        height: currentSize.height,
        width: currentSize.width,
      }}
      resizeMode="contain"
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {logoImage}
      </TouchableOpacity>
    );
  }

  return logoImage;
}

const styles = StyleSheet.create({});
