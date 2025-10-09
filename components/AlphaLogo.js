/**
 * AlphaLogo Component
 * Displays the Alphahandle logo
 */

import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function AlphaLogo({ size = 'medium', onPress }) {
  const sizes = {
    small: { height: 36, width: 190 },
    medium: { height: 46, width: 241 },  // Default: 46px high (42px + 10%)
    large: { height: 58, width: 304 },
  };

  const currentSize = sizes[size] || sizes.medium;

  const logoImage = (
    <Image
      source={require('../assets/alphahandle-logo.png')}
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
