/**
 * StarRating Component
 * Displays 5 yellow stars with optional label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StarRating({ label, size = 16 }) {
  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={[styles.star, { fontSize: size }]}>
            ★
          </Text>
        ))}
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    color: '#FFD700',
  },
  label: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
  },
});
