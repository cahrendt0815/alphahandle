/**
 * Plan Selection Screen
 * Shows plan options with Monthly/Yearly toggle and Stripe Checkout integration
 */

import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { getAllPlans } from '../services/entitlements';
import { createCheckoutSession } from '../services/checkout';
import { useAuth } from '../auth/AuthProvider';
import * as WebBrowser from 'expo-web-browser';

export default function PlanSelectionScreen({ navigation }) {
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const plans = getAllPlans(cycle);

  const handleSelectPlan = async (plan) => {
    setLoading(true);
    console.log(`[PlanSelection] Selected ${plan.name} - ${cycle}`);

    try {
      const email = user?.email;
      const { url, error } = await createCheckoutSession(plan.id, cycle, email);

      if (error) {
        Alert.alert('Error', error);
        setLoading(false);
        return;
      }

      console.log(`[PlanSelection] Opening checkout URL: ${url}`);

      // Open Stripe Checkout
      if (Platform.OS === 'web') {
        window.location.assign(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
        setLoading(false);
      }
    } catch (err) {
      console.error('[PlanSelection] Error creating checkout session:', err);
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    // Check if we can go back in navigation stack
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If no history (came from auth redirect), go to home
      navigation.navigate('Home');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Unlock full analysis history and track performance over time
          </Text>

          {/* Monthly/Yearly Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                cycle === 'monthly' && styles.toggleButtonActive,
              ]}
              onPress={() => setCycle('monthly')}
            >
              <Text
                style={[
                  styles.toggleText,
                  cycle === 'monthly' && styles.toggleTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                cycle === 'yearly' && styles.toggleButtonActive,
              ]}
              onPress={() => setCycle('yearly')}
            >
              <Text
                style={[
                  styles.toggleText,
                  cycle === 'yearly' && styles.toggleTextActive,
                ]}
              >
                Yearly
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>35% off</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.popular && styles.planCardPopular,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>

              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <Text style={styles.featureIcon}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  plan.popular && styles.selectButtonPopular,
                  loading && styles.selectButtonDisabled,
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={plan.popular ? '#FFFFFF' : '#1A1F36'} />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.selectButtonText,
                        plan.popular && styles.selectButtonTextPopular,
                      ]}
                    >
                      Continue
                    </Text>
                    <Text
                      style={[
                        styles.selectButtonArrow,
                        plan.popular && styles.selectButtonTextPopular,
                      ]}
                    >
                      →
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include a 7-day free trial.{'\n'}
            Cancel anytime, no questions asked.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 80,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  backButtonText: {
    fontSize: 15,
    color: '#635BFF',
    fontWeight: '600',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1F36',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7C93',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 600,
    marginBottom: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7C93',
  },
  toggleTextActive: {
    color: '#1A1F36',
  },
  discountBadge: {
    backgroundColor: '#00D924',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  plansContainer: {
    paddingHorizontal: 24,
    gap: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#635BFF',
    shadowColor: '#635BFF',
    shadowOpacity: 0.15,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: '#635BFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635BFF',
  },
  planDescription: {
    fontSize: 15,
    color: '#6B7C93',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00D924',
  },
  featureText: {
    fontSize: 15,
    color: '#1A1F36',
    flex: 1,
    lineHeight: 22,
  },
  selectButton: {
    backgroundColor: '#F6F9FC',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  selectButtonPopular: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  selectButtonDisabled: {
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },
  selectButtonTextPopular: {
    color: '#FFFFFF',
  },
  selectButtonArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },
  footer: {
    marginTop: 48,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#99B3C9',
    textAlign: 'center',
    lineHeight: 22,
  },
});
