/**
 * Plan Selection Placeholder Screen
 * Shows plan options before Stripe integration
 */

import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { getAllPlans } from '../services/entitlements';

export default function PlanSelectionPlaceholder({ navigation }) {
  const plans = getAllPlans();

  const handleSelectPlan = (plan) => {
    Alert.alert(
      'Coming Soon',
      `${plan.name} plan checkout will be available after Stripe integration.`,
      [{ text: 'OK' }]
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
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
          <Text style={styles.title}>Choose a plan to{'\n'}unlock full history</Text>
          <Text style={styles.subtitle}>
            Get access to comprehensive analysis data and track performance over time
          </Text>
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
                ]}
                onPress={() => handleSelectPlan(plan)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    plan.popular && styles.selectButtonTextPopular,
                  ]}
                >
                  Select {plan.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Stripe checkout integration coming soon.{'\n'}
            All plans include a 7-day free trial.
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
  },
  selectButtonPopular: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },
  selectButtonTextPopular: {
    color: '#FFFFFF',
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
