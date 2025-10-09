/**
 * BillingToggle Component
 * Monthly/Yearly toggle with "Save 35%" badge
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function BillingToggle({ cycle, onCycleChange }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, cycle === 'monthly' && styles.optionActive]}
        onPress={() => onCycleChange('monthly')}
        activeOpacity={0.7}
      >
        <Text style={[styles.optionText, cycle === 'monthly' && styles.optionTextActive]}>
          Monthly
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, cycle === 'yearly' && styles.optionActive]}
        onPress={() => onCycleChange('yearly')}
        activeOpacity={0.7}
      >
        <View style={styles.yearlyContent}>
          <Text style={[styles.optionText, cycle === 'yearly' && styles.optionTextActive]}>
            Yearly
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Save 40%</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f7f8fb',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: '#635BFF',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  yearlyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -24,
    right: -52,
    backgroundColor: '#00D924',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
