/**
 * Authentication Modal
 * Two tabs: Google OAuth and Email/Password
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
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { setAuthRedirectIntent } from '../utils/authRedirect';
import { PrimaryButton, TextLink } from './StripeButton';
import ResetPasswordModal from './ResetPasswordModal';

export default function AuthModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('google'); // 'google' or 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const { signInWithGoogle, signInWithEmailPassword } = useAuth();

  const handleGoogleSignIn = async () => {
    // Set redirect intent before auth
    setAuthRedirectIntent('Plans');

    setLoading(true);
    try {
      const { error } = await signInWithGoogle();

      if (error) {
        Alert.alert('Error', error.message || 'Failed to sign in with Google');
      } else {
        // OAuth redirect will handle the rest
        onClose();
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    // Set redirect intent before auth
    setAuthRedirectIntent('Plans');

    setLoading(true);
    console.log('[Auth] Signing in with email/password');

    try {
      const { error } = await signInWithEmailPassword(email, password);

      if (error) {
        console.error('[Auth] Sign in error:', error);
        Alert.alert('Error', error.message || 'Failed to sign in');
      } else {
        console.log('[Auth] Sign in successful');
        setEmail('');
        setPassword('');
        onClose();
      }
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
              <Text style={styles.title}>Sign in to continue</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'google' && styles.tabActive]}
                onPress={() => setActiveTab('google')}
              >
                <Text style={[styles.tabText, activeTab === 'google' && styles.tabTextActive]}>
                  Google
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'email' && styles.tabActive]}
                onPress={() => setActiveTab('email')}
              >
                <Text style={[styles.tabText, activeTab === 'email' && styles.tabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {activeTab === 'google' ? (
                <View style={styles.googleTab}>
                  <Text style={styles.description}>
                    Sign in with your Google account to unlock full access
                  </Text>
                  <PrimaryButton
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    style={styles.googleButton}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Continue with Google'}
                  </PrimaryButton>
                </View>
              ) : (
                <View style={styles.emailTab}>
                  <Text style={styles.description}>
                    Enter your email and password to sign in
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#9aa3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9aa3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <View style={styles.forgotPasswordContainer}>
                    <TextLink
                      onPress={() => {
                        setShowResetModal(true);
                      }}
                      showChevron={false}
                      style={styles.forgotPasswordLink}
                    >
                      Forgot password?
                    </TextLink>
                  </View>

                  <PrimaryButton
                    onPress={handleEmailSignIn}
                    disabled={loading}
                    style={styles.emailButton}
                    icon={null}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Sign in'}
                  </PrimaryButton>

                  <Text style={styles.emailNote}>
                    Password must be at least 6 characters
                  </Text>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By signing in, you agree to our Terms and Privacy Policy
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7f8fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#4b5563',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#635BFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  tabTextActive: {
    color: '#635BFF',
  },
  content: {
    padding: 32,
  },
  googleTab: {
    alignItems: 'stretch',
  },
  emailTab: {
    alignItems: 'stretch',
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 24,
    lineHeight: 22,
  },
  googleButton: {
    width: '100%',
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
    marginBottom: 16,
    height: 44,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordLink: {
    height: 'auto',
    paddingVertical: 4,
  },
  emailButton: {
    width: '100%',
    marginBottom: 12,
  },
  emailNote: {
    fontSize: 13,
    color: '#9aa3af',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    backgroundColor: '#f7f8fb',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  footerText: {
    fontSize: 12,
    color: '#9aa3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
