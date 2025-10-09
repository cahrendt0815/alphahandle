/**
 * Payment Success Screen
 * Shown after successful Stripe Checkout completion
 * Polls for entitlement activation and redirects to last searched handle
 */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getEntitlementForUser } from '../services/entitlements';
import { supabase } from '../utils/supabaseClient';

export default function PaySuccessScreen({ navigation, route }) {
  const sessionId = route.params?.session_id;
  const redirectTo = route.params?.redirectTo;
  const redirectHandle = route.params?.handle;
  const { user } = useAuth();
  const [activating, setActivating] = useState(true);
  const [activationComplete, setActivationComplete] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Home');
      return;
    }

    console.log('[PaySuccess] Checkout completed, session:', sessionId);

    let pollCount = 0;
    const maxPolls = 10; // 10 attempts = 20 seconds max

    // Poll for entitlement activation
    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log('[PaySuccess] Polling for entitlements, attempt:', pollCount);

      const entitlement = await getEntitlementForUser(user);

      if (entitlement.plan !== null) {
        console.log('[PaySuccess] Entitlement activated:', entitlement.plan);
        clearInterval(pollInterval);
        setActivating(false);
        setActivationComplete(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          // Use redirect params if provided, otherwise go to Portal
          if (redirectTo && redirectHandle) {
            console.log('[PaySuccess] Redirecting to:', redirectTo, 'with handle:', redirectHandle);
            navigation.navigate(redirectTo, { handle: redirectHandle });
          } else if (redirectTo) {
            console.log('[PaySuccess] Redirecting to:', redirectTo);
            navigation.navigate(redirectTo);
          } else {
            console.log('[PaySuccess] Redirecting to Portal');
            navigation.navigate('Portal');
          }
        }, 2000);

        return;
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.log('[PaySuccess] Max poll attempts reached');
        clearInterval(pollInterval);
        setActivating(false);
        setActivationComplete(true);

        // Still navigate after timeout
        setTimeout(() => {
          navigation.navigate('Home');
        }, 2000);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [user, sessionId, navigation]);

  const handleContinueManually = () => {
    // Use redirect params if provided, otherwise go to Portal
    if (redirectTo && redirectHandle) {
      navigation.navigate(redirectTo, { handle: redirectHandle });
    } else if (redirectTo) {
      navigation.navigate(redirectTo);
    } else {
      navigation.navigate('Portal');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, !activationComplete && styles.iconContainerPulse]}>
          {activating ? (
            <ActivityIndicator size="large" color="#635BFF" />
          ) : (
            <Text style={styles.icon}>✓</Text>
          )}
        </View>

        {/* Message */}
        {activating ? (
          <>
            <Text style={styles.title}>Activating your plan...</Text>
            <Text style={styles.subtitle}>
              Please wait while we set up your subscription. This usually takes just a few seconds.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.subtitle}>
              Your subscription is now active. You have full access to all analysis data.
            </Text>
          </>
        )}

        {/* Continue Button (only show after activation) */}
        {!activating && (
          <>
            <TouchableOpacity style={styles.button} onPress={handleContinueManually}>
              <Text style={styles.buttonText}>Continue to app</Text>
            </TouchableOpacity>

            {/* Footer Note */}
            <Text style={styles.note}>
              Your 7-day free trial starts now. You can cancel anytime from your account settings.
            </Text>
          </>
        )}
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
    backgroundColor: '#00D924',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainerPulse: {
    backgroundColor: '#F6F9FC',
    borderWidth: 2,
    borderColor: '#E3E8EF',
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
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
  button: {
    backgroundColor: '#635BFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  note: {
    fontSize: 13,
    color: '#99B3C9',
    textAlign: 'center',
    lineHeight: 20,
  },
});
