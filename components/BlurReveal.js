/**
 * Blur Reveal Component
 * Shows blurred placeholder rows with "See more" button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function BlurReveal({ onSeeMore, loading = false, remainingCount = 0 }) {
  return (
    <View style={styles.container}>
      {/* Blurred placeholder rows (slots 4-6) */}
      <View style={styles.blurredSection}>
        <View style={styles.overlay}>
          {/* Placeholder rows */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.placeholderRow}>
              <View style={[styles.placeholderCell, { width: '15%' }]} />
              <View style={[styles.placeholderCell, { width: '25%' }]} />
              <View style={[styles.placeholderCell, { width: '15%' }]} />
              <View style={[styles.placeholderCell, { width: '12%' }]} />
              <View style={[styles.placeholderCell, { width: '12%' }]} />
              <View style={[styles.placeholderCell, { width: '10%' }]} />
            </View>
          ))}

          {/* Gradient overlay */}
          <View style={styles.gradientOverlay} />

          {/* See more button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSeeMore}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    Show more {remainingCount > 0 ? `(${remainingCount} remaining)` : ''}
                  </Text>
                  <Text style={styles.buttonIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.hintText}>
              Click to load more trades
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  blurredSection: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFBFC',
  },
  overlay: {
    position: 'relative',
    paddingVertical: 24,
  },
  placeholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  placeholderCell: {
    height: 16,
    backgroundColor: '#E3E8EF',
    borderRadius: 4,
    opacity: 0.4,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(8px)',
  },
  buttonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -40 }],
    alignItems: 'center',
    zIndex: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hintText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7C93',
    fontWeight: '500',
    textAlign: 'center',
  },
});
