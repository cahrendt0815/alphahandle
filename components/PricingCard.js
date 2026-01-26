/**
 * PricingCard Component
 * Individual plan card with features and CTA
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PrimaryButton, SecondaryButton } from './StripeButton';

export default function PricingCard({
  plan,
  cycle,
  onSelectPlan,
  loading,
  isPopular,
  isCurrent,
  isUpgrade = false,
  isDowngrade = false,
  hasAnyPlan = false,
}) {
  const priceValue = cycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;
  const priceDisplay = `$${Math.round(priceValue)}`;
  const billingText = cycle === 'yearly' ? 'billed yearly' : 'billed monthly';

  // Determine button text and disabled state
  const getButtonText = () => {
    if (isCurrent) return 'Your Plan';
    if (isDowngrade) return 'Downgrade';
    if (isUpgrade) return 'Upgrade';
    return 'Continue';
  };

  const isButtonDisabled = isCurrent || isDowngrade;

  return (
    <View style={[styles.card, isPopular && styles.cardPopular]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most popular</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.planName}>{plan.name}</Text>
      </View>

      <View style={styles.priceBlock}>
        <Text style={styles.price}>{priceDisplay}</Text>
        <Text style={styles.billingCycle}>/mo</Text>
      </View>
      <Text style={styles.billingText}>{billingText}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#635BFF" />
        </View>
      ) : isPopular ? (
        <PrimaryButton
          onPress={() => {
            console.log('[PricingCard] Button clicked for plan:', plan.id);
            console.log('[PricingCard] isCurrent:', isCurrent, 'isUpgrade:', isUpgrade, 'isDowngrade:', isDowngrade);
            onSelectPlan(plan);
          }}
          disabled={isButtonDisabled}
          style={[styles.continueButton, isButtonDisabled && styles.disabledButton]}
        >
          {getButtonText()}
        </PrimaryButton>
      ) : (
        <SecondaryButton
          onPress={() => {
            console.log('[PricingCard] Button clicked for plan:', plan.id);
            console.log('[PricingCard] isCurrent:', isCurrent, 'isUpgrade:', isUpgrade, 'isDowngrade:', isDowngrade);
            onSelectPlan(plan);
          }}
          disabled={isButtonDisabled}
          style={[styles.continueButton, isButtonDisabled && styles.disabledButton]}
        >
          {getButtonText()}
        </SecondaryButton>
      )}

      <View style={styles.features}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E3E8EF',
    flex: 1,
    minWidth: 280,
    maxWidth: 340,
  },
  cardPopular: {
    borderColor: '#635BFF',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#635BFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 0,
  },
  planSubtitle: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 20,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0b0b0c',
    letterSpacing: -1,
  },
  billingCycle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 4,
  },
  billingText: {
    fontSize: 14,
    color: '#9aa3af',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 14,
    marginBottom: 24,
    alignItems: 'center',
  },
  continueButton: {
    marginBottom: 20,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.4,
  },
  features: {
    gap: 10,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00D924',
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
    lineHeight: 20,
  },
});
