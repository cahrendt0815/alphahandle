/**
 * PricingScreen - Notilo-inspired layout
 * Matches Notilo structure with Stripe aesthetic
 */

import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
  Pressable,
  Animated,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { createCheckoutSession } from '../services/checkout';
import * as WebBrowser from 'expo-web-browser';
import BillingToggle from '../components/BillingToggle';
import PricingCard from '../components/PricingCard';
import ComparisonTable from '../components/ComparisonTable';
import FAQAccordion from '../components/FAQAccordion';
import AlphaLogo from '../components/AlphaLogo';
import { TextLink, PrimaryButton } from '../components/StripeButton';
import { getEntitlementForUser } from '../services/entitlements';

// PLAN CONFIGURATION - Edit here to update copy
const PLAN_DATA = {
  ape: {
    id: 'ape',
    name: 'Ape',
    priceMonthly: 12,
    priceYearly: 84,
    searchLimit: 5,
    timelineMonths: 12,
    features: [
      '5 searches / month',
      'Timeline up to 12 months',
      'Recent Recommendations (full list)',
      'Full performance metrics (accuracy, avg return, win rate)',
      'Best & Worst trades',
    ],
  },
  degen: {
    id: 'degen',
    name: 'Degen',
    priceMonthly: 20,
    priceYearly: 144,
    searchLimit: 10,
    timelineMonths: 24,
    popular: true,
    features: [
      '10 searches / month',
      'Timeline up to 24 months',
      'Recent Recommendations (full list)',
      'Full performance metrics (accuracy, avg return, win rate)',
      'Best & Worst trades',
    ],
  },
  gigachad: {
    id: 'gigachad',
    name: 'GigaChad',
    priceMonthly: 31,
    priceYearly: 228,
    searchLimit: 50,
    timelineMonths: Infinity,
    features: [
      '50 searches / month',
      'Unlimited timeline',
      'Recent Recommendations (full list)',
      'Full performance metrics (accuracy, avg return, win rate)',
      'Best & Worst trades',
      'Export history (CSV)',
    ],
  },
};

export default function PricingScreen({ navigation, route }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Get redirect context from route params
  const redirectTo = route.params?.redirectTo;
  const redirectHandle = route.params?.handle;

  // Fetch current plan
  useEffect(() => {
    const fetchPlan = async () => {
      if (user) {
        console.log('[Pricing] Fetching entitlement for user:', user.id);
        const entitlement = await getEntitlementForUser(user);
        console.log('[Pricing] Entitlement received:', entitlement);
        console.log('[Pricing] Setting currentPlan to:', entitlement?.plan);
        setCurrentPlan(entitlement?.plan);
      } else {
        console.log('[Pricing] No user, currentPlan will be null');
        setCurrentPlan(null);
      }
    };
    fetchPlan();
  }, [user]);

  // Handle scroll for navbar shadow
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setNavbarScrolled(value > 20);
    });
    return () => scrollY.removeListener(listener);
  }, []);

  const plans = [PLAN_DATA.ape, PLAN_DATA.degen, PLAN_DATA.gigachad];

  // Plan hierarchy (index = tier level)
  const planTiers = { ape: 1, degen: 2, gigachad: 3 };

  const getPlanTier = (planId) => {
    if (!planId || planId === 'free') return 0;
    return planTiers[planId] || 0;
  };

  const canUpgradeToPlan = (targetPlanId) => {
    const currentTier = getPlanTier(currentPlan);
    const targetTier = getPlanTier(targetPlanId);
    return targetTier > currentTier;
  };

  const handleSelectPlan = async (plan) => {
    console.log('[Pricing] handleSelectPlan called for plan:', plan.id);
    console.log('[Pricing] User:', user ? 'logged in' : 'not logged in');
    console.log('[Pricing] Current plan:', currentPlan);
    console.log('[Pricing] Loading state:', loading);

    // Check if user is authenticated
    if (!user) {
      console.log('[Pricing] User not authenticated, redirecting to sign in');
      navigation.navigate('SignIn', { redirectTo: 'Pricing', handle: redirectHandle });
      return;
    }

    // Check if it's a downgrade attempt
    if (currentPlan && currentPlan !== 'free' && !canUpgradeToPlan(plan.id)) {
      if (currentPlan === plan.id) {
        Alert.alert('Info', 'This is your current plan. Visit Account to manage your subscription.');
      } else {
        Alert.alert('Info', 'You can only upgrade to a higher-tier plan. To downgrade, please cancel your current subscription from your Account page.');
      }
      return;
    }

    setLoading(true);
    console.log('[Pricing] Loading set to true');

    try {
      console.log('[Pricing] Creating checkout session for plan:', plan.id);

      // Build redirect context for post-payment
      const redirectContext = redirectTo && redirectHandle
        ? { redirectTo, handle: redirectHandle }
        : null;

      const { url, error } = await createCheckoutSession(
        plan.id,
        billingCycle,
        user?.email,
        redirectContext
      );

      if (error) {
        Alert.alert('Error', error);
        setLoading(false);
        return;
      }

      // Open Stripe Checkout
      if (Platform.OS === 'web') {
        window.location.assign(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
        setLoading(false);
      }
    } catch (err) {
      console.error('[Pricing] Checkout error:', err);
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const faqItems = [
    {
      question: 'Can I switch plans later?',
      answer:
        'Yes, upgrades pro-rate next cycle. You can upgrade or downgrade at any time.',
    },
    {
      question: 'Do you offer a free trial?',
      answer:
        'You can preview recent recommendations before subscribing. Full access requires a plan.',
    },
    {
      question: 'What counts as a search?',
      answer:
        "An analysis of one handle. Cached results don't consume quota — we only count fresh analyses.",
    },
    {
      question: 'How is timeline calculated?',
      answer:
        "Based on the plan's maximum lookback (12/24 months or unlimited for historical data).",
    },
    {
      question: 'Do you support invoices?',
      answer:
        'For annual GigaChad and above; contact us for enterprise invoicing.',
    },
    {
      question: 'Can I cancel anytime?',
      answer:
        'Yes, cancel anytime; access remains through the paid period. No questions asked.',
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Sticky Navigation Bar */}
      <View
        style={[
          styles.navbar,
          navbarScrolled && styles.navbarScrolled,
          Platform.OS === 'web' && { position: 'sticky', top: 0, zIndex: 1000 },
        ]}
      >
        <View style={styles.navbarContent}>
          <AlphaLogo size="small" onPress={() => navigation.navigate('Home')} />

          {isMobile ? (
            <TouchableOpacity
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={styles.hamburger}
            >
              <Text style={styles.hamburgerIcon}>
                {mobileMenuOpen ? '✕' : '☰'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navMenu}>
              <View style={styles.navCenter}>
                <Pressable
                  onPress={() => navigation.navigate('Pricing')}
                  style={styles.navLink}
                >
                  <Text style={styles.navLinkText}>Pricing</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    // Scroll to FAQ section
                    // For now, just navigate to pricing
                    navigation.navigate('Pricing');
                  }}
                  style={styles.navLink}
                >
                  <Text style={styles.navLinkText}>FAQ</Text>
                </Pressable>
              </View>
              {user ? (
                <>
                  <TextLink onPress={async () => {
                    await signOut();
                    navigation.navigate('Home');
                  }}>
                    Log out
                  </TextLink>
                </>
              ) : (
                <>
                  <TextLink onPress={() => navigation.navigate('SignIn', { redirectTo: 'Pricing' })}>
                    Sign In
                  </TextLink>
                  <PrimaryButton onPress={() => navigation.navigate('SignUp', { redirectTo: 'Pricing' })}>
                    Register
                  </PrimaryButton>
                </>
              )}
            </View>
          )}
        </View>

        {/* Mobile Menu Dropdown */}
        {isMobile && mobileMenuOpen && (
          <View style={styles.mobileMenu}>
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false);
                navigation.navigate('Pricing');
              }}
              style={styles.mobileMenuItem}
            >
              <Text style={styles.mobileMenuText}>Pricing</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false);
                navigation.navigate('Pricing');
              }}
              style={styles.mobileMenuItem}
            >
              <Text style={styles.mobileMenuText}>FAQ</Text>
            </Pressable>
            {user ? (
              <>
                <Pressable
                  onPress={async () => {
                    setMobileMenuOpen(false);
                    await signOut();
                    navigation.navigate('Home');
                  }}
                  style={styles.mobileMenuItem}
                >
                  <Text style={styles.mobileMenuText}>Log out</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setMobileMenuOpen(false);
                    navigation.navigate('SignIn', { redirectTo: 'Pricing' });
                  }}
                  style={styles.mobileMenuItem}
                >
                  <Text style={styles.mobileMenuText}>Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMobileMenuOpen(false);
                    navigation.navigate('SignUp', { redirectTo: 'Pricing' });
                  }}
                  style={styles.mobileMenuItem}
                >
                  <Text style={styles.mobileMenuText}>Register</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
              Simple plans for transparent analysis.
            </Text>
            <View style={styles.toggleWrapper}>
              <BillingToggle cycle={billingCycle} onCycleChange={setBillingCycle} />
            </View>
          </View>
        </View>

        {/* Plan Cards Grid */}
        <View style={styles.plansSection}>
          <View style={[styles.plansGrid, isMobile && styles.plansGridMobile]}>
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isUpgrade = currentPlan && currentPlan !== 'free' && canUpgradeToPlan(plan.id);
              const isDowngrade = currentPlan && currentPlan !== 'free' && !canUpgradeToPlan(plan.id) && !isCurrent;

              console.log('[Pricing] Rendering card for plan:', plan.id, {
                currentPlan,
                isCurrent,
                isUpgrade,
                isDowngrade,
                currentTier: getPlanTier(currentPlan),
                targetTier: getPlanTier(plan.id),
              });

              return (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  cycle={billingCycle}
                  onSelectPlan={handleSelectPlan}
                  loading={loading}
                  isPopular={plan.popular}
                  isCurrent={isCurrent}
                  isUpgrade={isUpgrade}
                  isDowngrade={isDowngrade}
                  hasAnyPlan={currentPlan && currentPlan !== 'free'}
                />
              );
            })}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently asked questions</Text>
          <FAQAccordion items={faqItems} />
        </View>

        {/* Legal & Footnotes */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            All prices in USD. Taxes may apply. Payments handled by Stripe (Test mode
            during development).
          </Text>
          <View style={styles.legalLinks}>
            <Pressable>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Text style={styles.legalDivider}>·</Text>
            <Pressable>
              <Text style={styles.legalLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.legalDivider}>·</Text>
            <Pressable>
              <Text style={styles.legalLink}>Status</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer Spacer */}
        <View style={styles.footerSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 0,
  },

  // Navbar
  navbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 38,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    zIndex: 1000,
  },
  navbarScrolled: {
    borderBottomColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1440,
    marginHorizontal: 'auto',
    width: '100%',
  },
  navMenu: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'center',
  },
  navCenter: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'center',
    position: 'fixed',
    left: '50%',
    transform: [{ translateX: '-50%' }],
  },
  navLink: {
    paddingVertical: 8,
  },
  navLinkText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4b5563',
  },
  hamburger: {
    padding: 8,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#4b5563',
  },
  mobileMenu: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  mobileMenuItem: {
    paddingVertical: 12,
  },
  mobileMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },

  // Header Section
  headerSection: {
    paddingVertical: 24,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    alignItems: 'center',
  },
  breadcrumb: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9aa3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 20,
    lineHeight: 44,
    letterSpacing: -1,
    textAlign: 'center',
    maxWidth: 800,
  },
  heroTitleMobile: {
    fontSize: 28,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 22,
    color: '#4b5563',
    lineHeight: 32,
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: 32,
  },
  toggleWrapper: {
    alignItems: 'center',
  },

  // Plans Section
  plansSection: {
    paddingVertical: 20,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
  },
  plansGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    flexWrap: 'wrap',
  },
  plansGridMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Comparison Section
  comparisonSection: {
    paddingVertical: 80,
    paddingHorizontal: 38,
    backgroundColor: '#fafbfc',
  },
  sectionTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0b0b0c',
    textAlign: 'center',
    marginBottom: 48,
  },

  // CTA Band
  ctaBand: {
    paddingVertical: 80,
    paddingHorizontal: 38,
    backgroundColor: '#f7f8fb',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E3E8EF',
  },
  ctaBandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0b0b0c',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaBandText: {
    fontSize: 20,
    color: '#4b5563',
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: 32,
    lineHeight: 30,
  },
  ctaBandButton: {
    backgroundColor: '#635BFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  ctaBandButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // FAQ Section
  faqSection: {
    paddingVertical: 80,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  faqTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0b0b0c',
    textAlign: 'center',
    marginBottom: 48,
  },

  // Legal Section
  legalSection: {
    paddingVertical: 48,
    paddingHorizontal: 38,
    backgroundColor: '#fafbfc',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  legalText: {
    fontSize: 14,
    color: '#9aa3af',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 22,
    marginBottom: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLink: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  legalDivider: {
    fontSize: 14,
    color: '#E3E8EF',
  },

  // Footer Spacer
  footerSpacer: {
    height: 40,
    backgroundColor: '#fafbfc',
  },
});
