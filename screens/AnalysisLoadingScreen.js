/**
 * AnalysisLoadingScreen - Shows loading state before auth gate
 * Displays status messages then authenticating message before redirecting to auth
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const LOADING_MESSAGES = [
  'Dialing into FinTwit HQ…',
  'Sharpening pencils for $analysis…',
  'Separating $alpha from $copium…',
  'Authenticating...',
];

export default function AnalysisLoadingScreen({ route, navigation }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const handle = route.params?.handle;

  useEffect(() => {
    console.log('[AnalysisLoading] Screen loaded with handle:', handle);

    // Show first 3 messages for 1 second each
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < LOADING_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    // After 5 seconds total (3s for first messages + 2s for "Authenticating..."), navigate to AuthGate
    const navigationTimeout = setTimeout(() => {
      console.log('[AnalysisLoading] Navigating to AuthGate with handle:', handle);
      navigation.replace('AuthGate', { handle });
    }, 5000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(navigationTimeout);
    };
  }, [handle, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.message}>
          {LOADING_MESSAGES[currentMessageIndex]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
  },
});
