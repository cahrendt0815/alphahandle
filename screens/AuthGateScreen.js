/**
 * AuthGateScreen - Authentication gate before accessing Portal
 * Split screen: signup form on left, product demo placeholder on right
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '../components/StripeButton';
import { supabase } from '../utils/supabaseClient';
import GoogleLogo from '../components/GoogleLogo';
import { storeHandleForAuth } from '../utils/authRedirectHandle';

const APP_URL = 'http://localhost:8083';

export default function AuthGateScreen({ route }) {
  const { user, signInWithGoogle } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const routeHandle = route.params?.handle;

  // Store handle in session storage so it survives OAuth redirects
  useEffect(() => {
    if (routeHandle) {
      console.log('[AuthGate] Storing handle for post-auth:', routeHandle);
      storeHandleForAuth(routeHandle);
    }
  }, [routeHandle]);

  // Redirect to portal if already authenticated (without handle - AuthProvider handles it)
  useEffect(() => {
    if (user) {
      console.log('[AuthGate] User already authenticated, redirecting to Portal');
      // AuthProvider will handle navigation with the stored handle
      navigation.replace('Portal');
    }
  }, [user, navigation]);

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setError('');

      // Store handle before OAuth redirect (in case route param gets lost)
      if (routeHandle) {
        storeHandleForAuth(routeHandle);
      }

      const { error } = await signInWithGoogle();

      if (error) {
        setError(error.message || 'Failed to sign up with Google');
      }
      // Navigation happens automatically via useEffect when user state updates
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      setLoading(true);
      setError('');

      // Validation
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Store handle before sign up (in case of email confirmation flow)
      if (routeHandle) {
        storeHandleForAuth(routeHandle);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${APP_URL}/portal${routeHandle ? `?handle=${routeHandle}` : ''}`,
        }
      });

      if (error) {
        setError(error.message || 'Failed to create account');
        setLoading(false);
        return;
      }

      console.log('[AuthGate] Sign up response:', data);

      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        // Email confirmation required
        setError('');
        setLoading(false);
        // Navigate with a success message parameter
        navigation.navigate('SignIn', {
          message: 'Account created! Please check your email to confirm your account before signing in.',
          handle: routeHandle
        });
        return;
      }

      // Auto sign-in successful (email confirmation disabled)
      console.log('[AuthGate] Auto sign-in successful, user state will update and trigger useEffect redirect');
      // Navigation happens automatically via useEffect when user state updates
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Side - Signup Form */}
      <View style={[styles.leftPanel, isMobile && styles.fullWidth]}>
        <View style={styles.formContainer}>
          <View style={styles.card}>
            {/* Title */}
            <Text style={styles.title}>Sign up to continue</Text>
            <Text style={styles.subtitle}>Create an account to view the full analysis.</Text>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
              disabled={loading}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#8F95B2"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#8F95B2"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8F95B2"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {/* Error Message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Create Account Button */}
              <View style={styles.buttonContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#635BFF" size="small" />
                  </View>
                ) : (
                  <PrimaryButton onPress={handleEmailSignUp}>
                    Create account
                  </PrimaryButton>
                )}
              </View>

              {/* Switch Link */}
              <View style={styles.linksContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn', { handle })}>
                  <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign in</Text></Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Right Side - Product Demo Placeholder (Grey background) */}
      {!isMobile && (
        <View style={styles.rightPanel}>
          {/* Placeholder for GIF - currently grey */}
          <View style={styles.demoPlaceholder}>
            <Text style={styles.demoPlaceholderText}>Product Demo</Text>
            <Text style={styles.demoPlaceholderSubtext}>(GIF placeholder)</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  demoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  demoPlaceholderSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  formContainer: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#697386',
    marginBottom: 32,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 100,
    height: 48,
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E3E8EF',
  },
  dividerText: {
    fontSize: 14,
    color: '#697386',
    paddingHorizontal: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 100,
    height: 48,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#0A2540',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  errorText: {
    fontSize: 14,
    color: '#DF1B41',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linksContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#697386',
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#635BFF',
  },
});
