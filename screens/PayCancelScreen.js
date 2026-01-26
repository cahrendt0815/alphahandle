/**
 * Payment Cancelled Screen
 * Shown when user cancels Stripe Checkout
 */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function PayCancelScreen({ navigation }) {
  const handleTryAgain = () => {
    navigation.navigate('Plans');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Cancel Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✕</Text>
        </View>

        {/* Cancel Message */}
        <Text style={styles.title}>Payment cancelled</Text>
        <Text style={styles.subtitle}>
          No worries! You can try again anytime or continue with limited access.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>Go to home</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text style={styles.note}>
          With a subscription, you'll unlock full analysis history and unlimited searches.
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
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 480,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3E8EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6B7C93',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1F36',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7C93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#635BFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F6F9FC',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },
  note: {
    fontSize: 13,
    color: '#99B3C9',
    textAlign: 'center',
    lineHeight: 20,
  },
});
