/**
 * PlaceholderImage Component
 * Displays colored placeholder boxes for images
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PlaceholderImage({ type = 'hero', style }) {
  const configs = {
    hero: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      text: '📊 Dashboard Preview',
      aspectRatio: 4 / 3,
    },
    flow: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      text: '🔄 Analysis Flow',
      aspectRatio: 16 / 9,
    },
    logo: {
      background: '#9aa3af',
      text: '',
      aspectRatio: 3 / 1,
    },
  };

  const config = configs[type] || configs.hero;

  return (
    <View
      style={[
        styles.container,
        { aspectRatio: config.aspectRatio },
        type === 'logo' && styles.logoContainer,
        style,
      ]}
    >
      <View
        style={[
          styles.gradient,
          type === 'hero' && styles.heroGradient,
          type === 'flow' && styles.flowGradient,
          type === 'logo' && styles.logoGradient,
        ]}
      >
        {config.text ? (
          <Text style={[styles.text, type === 'logo' && styles.logoText]}>
            {config.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f7f8fb',
  },
  logoContainer: {
    borderRadius: 0,
    height: 40,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    backgroundColor: '#667eea',
  },
  flowGradient: {
    backgroundColor: '#f5576c',
  },
  logoGradient: {
    backgroundColor: '#9aa3af',
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  logoText: {
    fontSize: 14,
    color: 'transparent',
  },
});
