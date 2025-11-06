import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton, SecondaryButton } from '../components/StripeButton';
import GoogleLogo from '../components/GoogleLogo';
import { storeHandleForAuth, getAndClearStoredHandle } from '../utils/authRedirectHandle';

const APP_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8083');

export default function SignInScreen({ route }) {
  const { user, signInWithGoogle, signInWithEmailPassword } = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const redirectTo = route.params?.redirectTo || 'Portal';
  const routeHandle = route.params?.handle;

  // Store handle in session storage
  useEffect(() => {
    if (routeHandle) {
      storeHandleForAuth(routeHandle);
    }
  }, [routeHandle]);

  // Show success message if coming from sign up
  useEffect(() => {
    if (route.params?.message) {
      setSuccessMessage(route.params.message);
    }
  }, [route.params?.message]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const handleToUse = routeHandle || getAndClearStoredHandle();
      const redirectParams = handleToUse ? { handle: handleToUse } : undefined;

      console.log('[SignIn] User already authenticated, redirecting to:', redirectTo, 'with handle:', handleToUse);
      navigation.navigate(redirectTo, redirectParams);
    }
  }, [user, navigation, redirectTo, routeHandle]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      // Store handle before OAuth redirect
      if (routeHandle) {
        storeHandleForAuth(routeHandle);
      }

      const { error } = await signInWithGoogle();

      if (error) {
        setError(error.message || 'Failed to sign in with Google');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
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

      const { error } = await signInWithEmailPassword(email, password);

      if (error) {
        setError(error.message || 'Failed to sign in');
        setLoading(false);
        return;
      }

      // Success - navigate to redirect destination
      console.log('[SignIn] Sign in successful, navigating to:', redirectTo, redirectParams);
      navigation.navigate(redirectTo, redirectParams);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.title}>Sign in to your account</Text>
        <Text style={styles.subtitle}>Welcome back! Please enter your details.</Text>

        {/* Google Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleLogo size={20} />
          <Text style={styles.googleButtonText}>Google</Text>
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
              placeholder="Enter your password"
              placeholderTextColor="#8F95B2"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Success Message */}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Sign In Button */}
          <View style={styles.buttonContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#635BFF" size="small" />
              </View>
            ) : (
              <PrimaryButton onPress={handleEmailSignIn}>
                Sign in
              </PrimaryButton>
            )}
          </View>

          {/* Auxiliary Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('AuthReset')}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
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
  successText: {
    fontSize: 14,
    color: '#0E9F6E',
    backgroundColor: '#DEF7EC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
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
