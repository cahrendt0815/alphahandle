/**
 * Auth Loading Screen
 * Shown while handling post-auth redirects
 */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

export default function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ActivityIndicator size="large" color="#635BFF" />

      <Text style={styles.text}>Just a moment...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7C93',
  },
});
