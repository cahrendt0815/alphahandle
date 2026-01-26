import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../auth/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { getEntitlementForUser, getPlanDetails } from '../services/entitlements';
import { PrimaryButton, SecondaryButton } from '../components/StripeButton';
import StatusBadge from '../components/StatusBadge';
import CurrencyAmount from '../components/CurrencyAmount';
import { supabase } from '../utils/supabaseClient';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!user) {
      console.log('[Account] User not authenticated, redirecting to sign in');
      navigation.navigate('SignIn', { redirectTo: 'Account' });
      return;
    }

    loadEntitlement();
    loadSubscription();
    loadInvoices();
  }, [user]);

  const loadEntitlement = async () => {
    try {
      setLoading(true);
      const data = await getEntitlementForUser(user);
      setEntitlement(data);
    } catch (error) {
      console.error('[Account] Error loading entitlement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Account] Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('[Account] Error loading subscription:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.log('[Account] No auth token available');
        setInvoicesLoading(false);
        return;
      }

      const response = await fetch(`${apiBase}/api/billing/invoices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices || []);
      } else {
        console.error('[Account] Error fetching invoices:', data.error);
      }
    } catch (error) {
      console.error('[Account] Error loading invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setManagingBilling(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        setManagingBilling(false);
        return;
      }

      const response = await fetch(`${apiBase}/api/billing/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to open billing portal');
        setManagingBilling(false);
        return;
      }

      // Open Stripe Customer Portal
      if (Platform.OS === 'web') {
        window.location.assign(data.url);
      } else {
        await WebBrowser.openBrowserAsync(data.url);
        setManagingBilling(false);
      }
    } catch (error) {
      console.error('[Account] Error opening billing portal:', error);
      Alert.alert('Error', 'Failed to open billing portal');
      setManagingBilling(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Home');
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleOpenInvoice = async (url) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const getPlanDisplayName = (planId) => {
    if (!planId || planId === 'free') return 'Free';
    const plan = getPlanDetails(planId);
    return plan?.name || planId;
  };

  const getSearchesRemaining = () => {
    if (!entitlement) return 0;
    return entitlement.searches_quota || 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#635BFF" />
      </View>
    );
  }

  const planName = getPlanDisplayName(entitlement?.plan);
  const searchesRemaining = getSearchesRemaining();
  const timelineMonths = entitlement?.timeline_months || 6;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        {/* Header */}
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your subscription and settings</Text>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </View>

        {/* Plan Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{planName}</Text>
              {entitlement?.plan === 'free' && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              )}
            </View>

            <View style={styles.usageContainer}>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Searches Remaining</Text>
                <Text style={styles.usageValue}>{searchesRemaining}</Text>
              </View>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Timeline Access</Text>
                <Text style={styles.usageValue}>
                  {timelineMonths === Infinity ? 'Unlimited' : `${timelineMonths} months`}
                </Text>
              </View>
            </View>

            {entitlement?.plan === 'free' && (
              <Text style={styles.upgradeText}>
                Upgrade to unlock more searches and extended timeline access
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {entitlement?.plan === 'free' ? (
            <PrimaryButton onPress={() => navigation.navigate('Pricing')}>
              Upgrade Plan
            </PrimaryButton>
          ) : (
            <>
              <PrimaryButton
                onPress={handleManageBilling}
                disabled={managingBilling || !subscription}
              >
                {managingBilling ? 'Opening...' : 'Manage Billing'}
              </PrimaryButton>
              <View style={styles.actionSpacer} />
              <SecondaryButton onPress={() => navigation.navigate('Pricing')}>
                Change Plan
              </SecondaryButton>
            </>
          )}

          <View style={styles.actionSpacer} />

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Billing History */}
        {entitlement?.plan !== 'free' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing History</Text>

            {invoicesLoading ? (
              <View style={styles.invoicesLoading}>
                <ActivityIndicator size="small" color="#635BFF" />
              </View>
            ) : invoices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No invoices yet.</Text>
              </View>
            ) : (
              <View style={styles.invoicesContainer}>
                {/* Header Row */}
                <View style={styles.invoiceHeader}>
                  <Text style={[styles.invoiceHeaderText, { flex: 2 }]}>Date</Text>
                  <Text style={[styles.invoiceHeaderText, { flex: 2 }]}>Amount</Text>
                  <Text style={[styles.invoiceHeaderText, { flex: 1 }]}>Status</Text>
                  <Text style={[styles.invoiceHeaderText, { flex: 1 }]}>Invoice</Text>
                </View>

                {/* Invoice Rows */}
                {invoices.map((invoice) => (
                  <View key={invoice.id} style={styles.invoiceRow}>
                    <Text style={[styles.invoiceCell, { flex: 2 }]}>
                      {formatDate(invoice.created)}
                    </Text>
                    <View style={{ flex: 2 }}>
                      <CurrencyAmount
                        amount={invoice.amount_paid}
                        currency={invoice.currency}
                        style={styles.invoiceCell}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <StatusBadge status={invoice.status} />
                    </View>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => handleOpenInvoice(invoice.hosted_invoice_url)}
                    >
                      <Text style={styles.invoiceLink}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
    paddingHorizontal: 38,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  card: {
    width: '100%',
    maxWidth: 640,
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
  },
  subtitle: {
    fontSize: 16,
    color: '#697386',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  label: {
    fontSize: 14,
    color: '#697386',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0A2540',
  },
  planCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A2540',
  },
  freeBadge: {
    backgroundColor: '#E3E8EF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#697386',
  },
  usageContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  usageItem: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 12,
    color: '#697386',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0A2540',
  },
  upgradeText: {
    fontSize: 14,
    color: '#697386',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  actionSpacer: {
    height: 8,
  },
  signOutButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 14,
    color: '#DF1B41',
    fontWeight: '500',
  },
  invoicesLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#697386',
    fontStyle: 'italic',
  },
  invoicesContainer: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  invoiceHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#697386',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invoiceRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
    alignItems: 'center',
  },
  invoiceCell: {
    fontSize: 14,
    color: '#0A2540',
  },
  invoiceLink: {
    fontSize: 14,
    color: '#635BFF',
    fontWeight: '500',
  },
});
