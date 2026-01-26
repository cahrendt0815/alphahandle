/**
 * AuthResetScreen
 * Handles password reset from email link
 * Route: /auth/reset
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../utils/supabaseClient';
import { PrimaryButton } from '../components/StripeButton';

export default function AuthResetScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Check if we're in password recovery mode
    const checkRecoveryMode = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Also check for recovery token in URL (web)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const type = params.get('type');
        if (type === 'recovery') {
          console.log('[Auth] Password recovery mode detected from URL');
          setIsRecoveryMode(true);
          return;
        }
      }

      // Check session
      if (session) {
        console.log('[Auth] Session found, checking for recovery mode');
        setIsRecoveryMode(true);
      } else {
        console.log('[Auth] No recovery session found');
        Alert.alert(
          'Invalid Link',
          'This password reset link is invalid or has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      }
    };

    checkRecoveryMode();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state changed:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Password recovery state detected');
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigation]);

  const handleUpdatePassword = async () => {
    // Validation
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match');
      return;
    }

    setLoading(true);
    console.log('[Auth] Updating password');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[Auth] Password update error:', error);
        Alert.alert('Error', error.message || 'Failed to update password');
        setLoading(false);
        return;
      }

      console.log('[Auth] Password updated successfully');

      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully. You\'re now signed in.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to pricing or home
              navigation.navigate('Pricing');
            },
          },
        ]
      );
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!isRecoveryMode) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#635BFF" />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter a new password for your account
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9aa3af"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Text style={styles.helperText}>
                Must be at least 6 characters
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9aa3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <Text style={styles.errorText}>
                  Passwords do not match
                </Text>
              )}
            </View>

            <PrimaryButton
              onPress={handleUpdatePassword}
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              style={styles.updateButton}
              icon={null}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Update password'}
            </PrimaryButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 38,
  },
  content: {
    maxWidth: 480,
    width: '100%',
    marginHorizontal: 'auto',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b0b0c',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#0b0b0c',
    backgroundColor: '#f7f8fb',
    height: 44,
  },
  helperText: {
    fontSize: 13,
    color: '#9aa3af',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  updateButton: {
    width: '100%',
    marginTop: 16,
  },
});
