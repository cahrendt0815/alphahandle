/**
 * HomeScreen - Notilo-inspired layout
 * Stripe-clean aesthetic with Notilo's structure
 */

import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { validateHandle } from '../services/fintwitService';
import { useAuth } from '../auth/AuthProvider';
import AlphaLogo from '../components/AlphaLogo';
import StarRating from '../components/StarRating';
import FAQAccordion from '../components/FAQAccordion';
import PlaceholderImage from '../components/PlaceholderImage';
import { TextLink, PrimaryButton } from '../components/StripeButton';

export default function HomeScreen({ navigation }) {
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Handle scroll for navbar shadow
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setNavbarScrolled(value > 20);
    });
    return () => scrollY.removeListener(listener);
  }, []);

  const handleSubmit = () => {
    if (!twitterHandle.trim()) {
      Alert.alert('Error', 'Please enter a Twitter handle');
      return;
    }

    if (!validateHandle(twitterHandle)) {
      Alert.alert(
        'Invalid Handle',
        'Please enter a valid Twitter handle (1-15 characters, letters, numbers, and underscores only)'
      );
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      navigation.navigate('Portal', { handle: twitterHandle });
    }, 500);
  };

  const faqItems = [
    {
      question: 'What data do you analyze?',
      answer:
        "Public posts on X (Twitter) and the tickers mentioned, matched to market returns.",
    },
    {
      question: 'How do you measure performance?',
      answer:
        'We compute returns from mention date vs. benchmarks; win rate, average return, and best/worst.',
    },
    {
      question: 'Do you require authentication?',
      answer:
        'No for the first preview. Auth is required to unlock full timelines and higher limits.',
    },
    {
      question: 'How accurate is it?',
      answer:
        'We combine AI with rules and allow appeals; classification precision improves over time.',
    },
    {
      question: 'Is there an API?',
      answer: 'Yes — coming soon for programmatic access and backtesting.',
    },
    {
      question: 'How much does it cost?',
      answer:
        'Ape, Degen, and GigaChad plans. Yearly saves 35%. See Pricing.',
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
                    // Scroll to FAQ section on home page
                    navigation.navigate('Home');
                  }}
                  style={styles.navLink}
                >
                  <Text style={styles.navLinkText}>FAQ</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => navigation.navigate('HealthAndAAPL')}
                style={styles.navLink}
              >
                <Text style={styles.navLinkText}>API Test</Text>
              </Pressable>
              {user ? (
                <>
                  <TextLink onPress={async () => {
                    await signOut();
                    navigation.navigate('Home');
                  }}>
                    Sign Out
                  </TextLink>
                </>
              ) : (
                <>
                  <TextLink onPress={() => navigation.navigate('SignIn', { redirectTo: 'Home' })}>
                    Sign In
                  </TextLink>
                  <PrimaryButton onPress={() => navigation.navigate('SignUp', { redirectTo: 'Home' })}>
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
                navigation.navigate('Home');
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
                    navigation.navigate('SignIn', { redirectTo: 'Home' });
                  }}
                  style={styles.mobileMenuItem}
                >
                  <Text style={styles.mobileMenuText}>Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMobileMenuOpen(false);
                    navigation.navigate('SignUp', { redirectTo: 'Home' });
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
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
          <View style={styles.heroContainer}>
            <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
              <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
                See the real track record.
              </Text>
              <Text style={styles.heroSubtitle}>
                Analyze any FinTwit account to reveal verified performance metrics—no
                cherry-picking, no vibes. Just data.
              </Text>

              {/* Handle Input */}
              <View style={styles.handleInputGroup}>
                <TextInput
                  style={styles.handleInput}
                  placeholder="@elonmusk"
                  placeholderTextColor="#9aa3af"
                  value={twitterHandle}
                  onChangeText={setTwitterHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <PrimaryButton
                  onPress={handleSubmit}
                  disabled={isAnalyzing}
                  style={styles.analyzeButtonOverride}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </PrimaryButton>
              </View>

              {/* Social Proof */}
              <View style={styles.socialProof}>
                <StarRating rating={4.9} />
                <Text style={styles.socialProofText}>
                  Trusted by 1,200+ analysts and traders
                </Text>
              </View>
            </View>

            {isMobile ? null : (
              <View style={styles.heroRight}>
                <PlaceholderImage type="card" />
              </View>
            )}
          </View>
        </View>

        {/* Trust Logos Band */}
        <View style={styles.trustBand}>
          <Text style={styles.trustBandTitle}>Users that trust us have worked for</Text>
          <View style={styles.trustLogos}>
            {['Goldman Sachs', 'Blackstone', 'KKR', 'Citadel', 'D. E. Shaw'].map(
              (company, idx) => (
                <View key={idx} style={styles.trustLogo}>
                  <Text style={styles.trustLogoText}>{company}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Middle Value Section */}
        <View style={styles.valueSection}>
          {/* Three Value Cards */}
          <View style={styles.valueCardsContainer}>
            <View style={[styles.valueCard, isMobile && styles.valueCardMobile]}>
              <View style={styles.valueIcon}>
                <Text style={styles.valueIconText}>🛡️</Text>
              </View>
              <Text style={styles.valueCardTitle}>Verified performance, not vibes.</Text>
              <Text style={styles.valueCardBody}>
                We parse posts, extract stock mentions, and calculate outcomes against
                market benchmarks.
              </Text>
            </View>

            <View style={[styles.valueCard, isMobile && styles.valueCardMobile]}>
              <View style={styles.valueIcon}>
                <Text style={styles.valueIconText}>🧠</Text>
              </View>
              <Text style={styles.valueCardTitle}>AI-assisted accuracy.</Text>
              <Text style={styles.valueCardBody}>
                Advanced NLP + rules ensure we attribute calls correctly and avoid
                cherry-picking.
              </Text>
            </View>

            <View style={[styles.valueCard, isMobile && styles.valueCardMobile]}>
              <View style={styles.valueIcon}>
                <Text style={styles.valueIconText}>⚡</Text>
              </View>
              <Text style={styles.valueCardTitle}>Fast and affordable.</Text>
              <Text style={styles.valueCardBody}>
                Near-instant analysis with pricing that scales — free trial to start.
              </Text>
            </View>
          </View>

          {/* Alternating Row - How It Works */}
          <View style={[styles.howItWorksRow, isMobile && styles.howItWorksRowMobile]}>
            <View style={[styles.howItWorksImage, isMobile && styles.howItWorksImageMobile]}>
              <PlaceholderImage type="flow" />
            </View>
            <View style={[styles.howItWorksContent, isMobile && styles.howItWorksContentMobile]}>
              <Text style={styles.howItWorksTitle}>How it works</Text>
              <View style={styles.howItWorksList}>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksBullet}>1.</Text>
                  <View style={styles.howItWorksItemText}>
                    <Text style={styles.howItWorksItemTitle}>Enter a handle</Text>
                    <Text style={styles.howItWorksItemBody}>
                      We normalize and fetch posts.
                    </Text>
                  </View>
                </View>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksBullet}>2.</Text>
                  <View style={styles.howItWorksItemText}>
                    <Text style={styles.howItWorksItemTitle}>
                      We extract stock calls
                    </Text>
                    <Text style={styles.howItWorksItemBody}>
                      Detect tickers, direction, date.
                    </Text>
                  </View>
                </View>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksBullet}>3.</Text>
                  <View style={styles.howItWorksItemText}>
                    <Text style={styles.howItWorksItemTitle}>We compute outcomes</Text>
                    <Text style={styles.howItWorksItemBody}>
                      Returns, win rate, and best/worst trades.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Metrics Strip */}
          <View style={[styles.metricsStrip, isMobile && styles.metricsStripMobile]}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>74%</Text>
              <Text style={styles.metricLabel}>avg classification precision</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>&lt;1s</Text>
              <Text style={styles.metricLabel}>cache hits</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>10k+</Text>
              <Text style={styles.metricLabel}>analyses run</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>$0</Text>
              <Text style={styles.metricLabel}>to try</Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently asked questions</Text>
          <FAQAccordion items={faqItems} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerColumns, isMobile && styles.footerColumnsMobile]}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Product</Text>
              <Text style={styles.footerLink}>Overview</Text>
              <Pressable onPress={() => navigation.navigate('Pricing')}>
                <Text style={styles.footerLink}>Pricing</Text>
              </Pressable>
              <Text style={styles.footerLink}>Roadmap</Text>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Company</Text>
              <Text style={styles.footerLink}>About</Text>
              <Text style={styles.footerLink}>Contact</Text>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Resources</Text>
              <Text style={styles.footerLink}>Docs (coming soon)</Text>
              <Text style={styles.footerLink}>Changelog</Text>
              <Text style={styles.footerLink}>Status</Text>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Legal</Text>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerLink}>Privacy</Text>
            </View>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>
              © Fintwit Performance {new Date().getFullYear()}. All rights reserved.
            </Text>
          </View>
        </View>
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
    gap: 24,
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

  // Hero Section
  heroSection: {
    paddingVertical: 100,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
  },
  heroSectionDesktop: {
    minHeight: 600,
  },
  heroContainer: {
    flexDirection: 'row',
    gap: 80,
    maxWidth: 1440,
    marginHorizontal: 'auto',
    width: '100%',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
    maxWidth: 600,
  },
  heroContentMobile: {
    maxWidth: '100%',
  },
  heroTitle: {
    fontSize: 64,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 24,
    lineHeight: 72,
    letterSpacing: -1.5,
  },
  heroTitleMobile: {
    fontSize: 48,
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 20,
    color: '#4b5563',
    marginBottom: 40,
    lineHeight: 32,
  },
  handleInputGroup: {
    flexDirection: 'row',
    backgroundColor: '#f7f8fb',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    padding: 6,
    marginBottom: 24,
    alignItems: 'center',
  },
  handleInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#0b0b0c',
    height: 42,
  },
  analyzeButtonOverride: {
    marginLeft: 8,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialProofText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
  heroRight: {
    flex: 1,
    maxWidth: 600,
  },
  heroImage: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },

  // Trust Band
  trustBand: {
    paddingVertical: 48,
    paddingHorizontal: 38,
    backgroundColor: '#fafbfc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E3E8EF',
  },
  trustBandTitle: {
    fontSize: 13,
    color: '#9aa3af',
    textAlign: 'center',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  trustLogos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  trustLogo: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  trustLogoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9aa3af',
  },

  // Value Section
  valueSection: {
    paddingVertical: 100,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
  },
  valueCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 32,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    marginBottom: 100,
  },
  valueCard: {
    width: 320,
    alignItems: 'flex-start',
  },
  valueCardMobile: {
    width: '100%',
  },
  valueIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  valueIconText: {
    fontSize: 32,
  },
  valueCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 12,
  },
  valueCardBody: {
    fontSize: 18,
    color: '#4b5563',
    lineHeight: 28,
  },

  // How It Works Row
  howItWorksRow: {
    flexDirection: 'row',
    gap: 80,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    marginBottom: 80,
    alignItems: 'center',
  },
  howItWorksRowMobile: {
    flexDirection: 'column',
    gap: 40,
  },
  howItWorksImage: {
    flex: 1,
  },
  howItWorksImageMobile: {
    width: '100%',
  },
  howItWorksContent: {
    flex: 1,
  },
  howItWorksContentMobile: {
    width: '100%',
  },
  howItWorksTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 32,
  },
  howItWorksList: {
    gap: 24,
  },
  howItWorksItem: {
    flexDirection: 'row',
    gap: 16,
  },
  howItWorksBullet: {
    fontSize: 18,
    fontWeight: '700',
    color: '#635BFF',
    width: 24,
  },
  howItWorksItemText: {
    flex: 1,
  },
  howItWorksItemTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 4,
  },
  howItWorksItemBody: {
    fontSize: 17,
    color: '#4b5563',
    lineHeight: 26,
  },

  // Metrics Strip
  metricsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 40,
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  metricsStripMobile: {
    gap: 24,
  },
  metricItem: {
    alignItems: 'center',
    minWidth: 120,
  },
  metricValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
  },

  // FAQ Section
  faqSection: {
    paddingVertical: 100,
    paddingHorizontal: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  faqTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 64,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingVertical: 80,
    paddingHorizontal: 38,
    backgroundColor: '#fafbfc',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  footerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    marginBottom: 64,
    gap: 40,
  },
  footerColumnsMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  footerColumn: {
    flex: 1,
    minWidth: 160,
  },
  footerColumnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b0b0c',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerLink: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    fontWeight: '500',
  },
  footerBottom: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  footerCopyright: {
    fontSize: 14,
    color: '#9aa3af',
    textAlign: 'center',
  },
});
