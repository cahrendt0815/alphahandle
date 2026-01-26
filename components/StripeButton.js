/**
 * StripeButton Component
 * Primary and Secondary button styles matching Stripe's design system
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

export function PrimaryButton({
  onPress,
  children,
  disabled = false,
  style,
  textStyle,
  icon = '→'
}) {
  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text style={[styles.primaryText, textStyle]}>
        {children}
      </Text>
      {icon && <Text style={[styles.primaryIcon, textStyle]}>{icon}</Text>}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  onPress,
  children,
  disabled = false,
  style,
  textStyle,
  icon = '→'
}) {
  return (
    <TouchableOpacity
      style={[
        styles.secondaryButton,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text style={[styles.secondaryText, textStyle]}>
        {children}
      </Text>
      {icon && <Text style={[styles.secondaryIcon, textStyle]}>{icon}</Text>}
    </TouchableOpacity>
  );
}

export function TextLink({
  onPress,
  children,
  disabled = false,
  style,
  textStyle,
  showChevron = true
}) {
  return (
    <TouchableOpacity
      style={[
        styles.textLink,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="link"
    >
      <Text style={[styles.textLinkText, textStyle]}>
        {children}
      </Text>
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Primary Button (filled, pill-shaped)
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A2540',
    height: 42,
    paddingHorizontal: 24,
    borderRadius: 100, // Fully pill-shaped
    gap: 8,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryIcon: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Secondary Button (outlined, pill-shaped)
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A2540',
    borderWidth: 1.5,
    borderColor: '#0A2540',
    height: 42,
    paddingHorizontal: 32,
    borderRadius: 100, // Fully pill-shaped
    gap: 8,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  secondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryIcon: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Text Link (no background)
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  textLinkText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0b0b0c',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0b0b0c',
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s ease',
    }),
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
});

// Web-specific hover styles
if (Platform.OS === 'web') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* Primary Button Hover */
    [data-button="primary"]:hover {
      transform: scale(1.02);
      background-color: #1A3A52;
    }

    /* Secondary Button Hover */
    [data-button="secondary"]:hover {
      background-color: #F7F8FB;
      border-color: #0b0b0c;
    }

    /* Text Link Hover */
    [data-button="text-link"]:hover {
      color: #635BFF;
    }

    [data-button="text-link"]:hover .chevron {
      transform: translateX(2px);
    }
  `;
  if (typeof document !== 'undefined') {
    document.head.appendChild(styleSheet);
  }
}
