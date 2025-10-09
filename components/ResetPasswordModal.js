/**
 * ResetPasswordModal Component
 * Handles password reset email request
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { PrimaryButton, TextLink } from './StripeButton';

const APP_URL = Platform.OS === 'web'
  ? window.location.origin
  : 'http://localhost:8083';

export default function ResetPasswordModal({ visible, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    console.log('[Auth] Sending reset link to', email);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/auth/reset`,
      });

      if (error) {
        console.error('[Auth] Password reset error:', error);
        Alert.alert('Error', error.message || 'Failed to send reset link');
        setLoading(false);
        return;
      }

      console.log('[Auth] Sent reset link to', email);
      Alert.alert(
        'Reset Link Sent',
        'Check your inbox for a password reset link.',
        [
          {
            text: 'OK',
            onPress: () => {
              setEmail('');
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <TextLink
              onPress={onClose}
              style={styles.closeButton}
              showChevron={false}
            >
              ✕
            </TextLink>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="your@email.com"
              placeholderTextColor="#9aa3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <PrimaryButton
              onPress={handleSendResetLink}
              disabled={loading}
              style={styles.sendButton}
              icon={null}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Send reset link'}
            </PrimaryButton>

            <View style={styles.footer}>
              <TextLink onPress={onClose} showChevron={false}>
                Cancel
              </TextLink>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 38,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b0b0c',
  },
  closeButton: {
    height: 32,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 32,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 24,
    lineHeight: 22,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#0b0b0c',
    backgroundColor: '#f7f8fb',
    marginBottom: 24,
    height: 44,
  },
  sendButton: {
    width: '100%',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
  },
});
