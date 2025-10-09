/**
 * Authentication Provider using Supabase
 * Manages user session, Google OAuth, and Email magic links with redirect handling
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Alert } from 'react-native';
import { getAndClearAuthRedirectIntent, getAuthRedirectUrl } from '../utils/authRedirect';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isHandlingRedirect: false,
  signInWithGoogle: async () => {},
  signInWithEmailMagicLink: async () => {},
  signInWithEmailPassword: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children, navigationRef }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(false);

  useEffect(() => {
    // Check for redirect intent immediately on mount
    const redirectIntent = getAndClearAuthRedirectIntent();
    if (redirectIntent) {
      console.log('[Auth] Found redirect intent on mount:', redirectIntent.route);
      setIsHandlingRedirect(true);

      // Set a timer to clear the handling state after navigation completes
      setTimeout(() => {
        setIsHandlingRedirect(false);
        console.log('[Auth] Cleared redirect handling flag');
      }, 1000); // Give linking time to navigate
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        console.log('[Auth] User signed in:', session.user.email);

        // Show welcome message if coming from auth
        if (redirectIntent) {
          setTimeout(() => {
            const displayName = session.user.user_metadata?.full_name ||
                               session.user.user_metadata?.name ||
                               session.user.email;
            Alert.alert('Welcome!', `Signed in as ${displayName}`);
          }, 1200);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] Auth state changed:', _event);
      setSession(session);
      setUser(session?.user ?? null);

      // Handle password recovery state
      if (_event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Password recovery state detected');
        // Navigation to /auth/reset is handled by the AuthResetScreen itself
        // We just need to ensure the session is set
      }

      // Show welcome message for sign-ins that happen in the app (not from redirect)
      if (_event === 'SIGNED_IN' && session?.user && !redirectIntent) {
        const displayName = session.user.user_metadata?.full_name ||
                           session.user.user_metadata?.name ||
                           session.user.email;

        setTimeout(() => {
          Alert.alert('Welcome!', `Signed in as ${displayName}`);
        }, 500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigationRef]);

  const signInWithGoogle = async () => {
    try {
      console.log('[Auth] Initiating Google sign in...');

      // Redirect to portal after auth
      const redirectTo = getAuthRedirectUrl('/portal');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[Auth] Google sign in error:', error);
        throw error;
      }

      console.log('[Auth] Google OAuth initiated');
      return { data, error: null };
    } catch (error) {
      console.error('[Auth] Exception during Google sign in:', error);
      return { data: null, error };
    }
  };

  const signInWithEmailMagicLink = async (email) => {
    try {
      console.log('[Auth] Sending magic link to:', email);

      // Redirect to /pricing after email confirmation
      const redirectTo = getAuthRedirectUrl('/pricing');

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        console.error('[Auth] Email magic link error:', error);
        throw error;
      }

      console.log('[Auth] Magic link sent successfully');

      // Show success message
      Alert.alert(
        'Check your email',
        `We sent a magic link to ${email}. Click the link to sign in.`
      );

      return { data, error: null };
    } catch (error) {
      console.error('[Auth] Exception during email sign in:', error);
      return { data: null, error };
    }
  };

  const signInWithEmailPassword = async (email, password) => {
    try {
      console.log('[Auth] Signing in with email/password:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Email/password sign in error:', error);
        throw error;
      }

      console.log('[Auth] Signed in with email/password successfully');
      return { data, error: null };
    } catch (error) {
      console.error('[Auth] Exception during email/password sign in:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[Auth] Sign out error:', error);
        throw error;
      }

      console.log('[Auth] Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('[Auth] Exception during sign out:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    isHandlingRedirect,
    signInWithGoogle,
    signInWithEmailMagicLink,
    signInWithEmailPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
