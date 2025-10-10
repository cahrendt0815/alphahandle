/**
 * PortalScreen - Main user portal with left sidebar navigation
 * Stripe-inspired design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton } from '../components/StripeButton';
import MagnifyingGlassIcon from '../components/MagnifyingGlassIcon';
import SignOutIcon from '../components/SignOutIcon';
import ChevronIcon from '../components/ChevronIcon';
import LockIcon from '../components/LockIcon';
import ExternalLinkIcon from '../components/ExternalLinkIcon';
import { analyzeHandle, getCachedAnalysis } from '../services/fintwitService';
import { getEntitlementForUser, hasFullAccess } from '../services/entitlements';
import BlurReveal from '../components/BlurReveal';

export default function PortalScreen({ navigation, route }) {
  const { user, signOut, loading } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeTab, setActiveTab] = useState('analyzer');
  const [twitterHandle, setTwitterHandle] = useState('');

  // Analysis state
  const [data, setData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get handle from route params if provided
  const routeHandle = route.params?.handle;

  // Load analysis if handle is provided in route params
  useEffect(() => {
    if (routeHandle) {
      setTwitterHandle(routeHandle);
      loadAnalysis(routeHandle);
    }
  }, [routeHandle]);

  // Check user's entitlements and auto-unlock if they have access
  useEffect(() => {
    async function checkAccess() {
      if (user) {
        const entitlement = await getEntitlementForUser(user);
        const hasAccess = hasFullAccess(entitlement);
        console.log('[Portal] User entitlement:', entitlement);
        console.log('[Portal] Has full access:', hasAccess);

        if (hasAccess) {
          console.log('[Portal] ✅ Auto-unlocking all trades for subscribed user');
          setShowAllTrades(true);
        }
      }
    }
    checkAccess();
  }, [user]);

  const loadAnalysis = async (handle) => {
    let mounted = true;
    setAnalysisLoading(true);

    try {
      // Try cached data first
      const cachedData = await getCachedAnalysis(handle);
      if (cachedData && mounted) {
        console.log('[Portal] Showing cached data');
        setData(cachedData);
        setAnalysisLoading(false);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();

        setIsRefreshing(true);
      }

      // Fetch fresh data
      const freshData = await analyzeHandle(handle);
      if (mounted) {
        console.log('[Portal] Updating with fresh data');
        setData(freshData);
        setAnalysisLoading(false);
        setIsRefreshing(false);

        if (fadeAnim._value === 0) {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }
      }
    } catch (error) {
      console.error('[Portal] Error fetching analysis:', error);
      if (mounted) {
        setAnalysisLoading(false);
        setIsRefreshing(false);
      }
    }

    return () => {
      mounted = false;
    };
  };

  // Get user's first letter for avatar
  const getUserInitial = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplay = () => {
    return user?.user_metadata?.full_name || user?.email || 'User';
  };

  // Plan data - show "Free Plan" for non-authenticated users
  const planData = user ? {
    name: 'Ape Plan',
    searchesUsed: 3,
    searchesTotal: 10,
  } : {
    name: 'Free Plan',
    searchesUsed: 0,
    searchesTotal: 0,
  };

  const searchesProgress = planData.searchesTotal > 0
    ? (planData.searchesUsed / planData.searchesTotal) * 100
    : 0;

  const menuItems = [
    {
      id: 'analyzer',
      label: 'Handle Analyzer',
      icon: 'search',
      isCustomIcon: true,
    },
    {
      id: 'favourites',
      label: 'Favourites',
      icon: '★',
    },
    {
      id: 'share',
      label: 'Share on X & earn',
      icon: '𝕏',
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Home');
  };

  const handleAnalyze = () => {
    if (twitterHandle.trim()) {
      loadAnalysis(twitterHandle);
    }
  };

  const handleSeeMore = async () => {
    console.log('[Portal] See more clicked');

    // Not authenticated? Navigate to sign in with redirect back to Portal
    if (!user) {
      console.log('[Portal] User not authenticated, navigating to sign in');
      navigation.navigate('SignIn', { redirectTo: 'Portal', handle: twitterHandle });
      return;
    }

    // Authenticated but no plan? Navigate to pricing with redirect context
    const entitlement = await getEntitlementForUser(user);

    if (!hasFullAccess(entitlement)) {
      console.log('[Portal] User has no plan, navigating to pricing');
      navigation.navigate('Pricing', { redirectTo: 'Portal', handle: twitterHandle });
      return;
    }

    // Has plan? Show all trades
    console.log('[Portal] User has access, showing all trades');
    setShowAllTrades(true);
  };

  // Get dummy data for display
  const getDummyTrades = () => {
    return [
      {
        ticker: 'TSLA',
        company: 'Tesla Inc',
        dateMentioned: '2024-01-15',
        beginningValue: 245.50,
        lastValue: 289.30,
        dividends: 0.00,
        adjLastValue: 289.30,
        stockReturn: 17.8,
        alphaVsSPY: 12.3,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://twitter.com/chamath/status/123456789'
      },
      {
        ticker: 'NVDA',
        company: 'NVIDIA Corporation',
        dateMentioned: '2024-01-08',
        beginningValue: 495.20,
        lastValue: 612.80,
        dividends: 0.16,
        adjLastValue: 612.96,
        stockReturn: 23.8,
        alphaVsSPY: 18.2,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://twitter.com/chamath/status/123456790'
      },
      {
        ticker: 'AMZN',
        company: 'Amazon.com Inc',
        dateMentioned: '2023-12-20',
        beginningValue: 152.30,
        lastValue: 168.50,
        dividends: 0.00,
        adjLastValue: 168.50,
        stockReturn: 10.6,
        alphaVsSPY: 5.1,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://twitter.com/chamath/status/123456791'
      },
      {
        ticker: 'META',
        company: 'Meta Platforms Inc',
        dateMentioned: '2023-12-10',
        beginningValue: 328.40,
        lastValue: 412.90,
        dividends: 0.00,
        adjLastValue: 412.90,
        stockReturn: 25.7,
        alphaVsSPY: 20.2,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://twitter.com/chamath/status/123456792'
      }
    ];
  };

  // Get visible trades (use real data from analysis if available, otherwise dummy data)
  const getVisibleTrades = () => {
    console.log('[Portal DEBUG] getVisibleTrades called');
    console.log('[Portal DEBUG] data exists?', !!data);
    console.log('[Portal DEBUG] data.recentTrades?', data?.recentTrades);
    console.log('[Portal DEBUG] recentTrades length?', data?.recentTrades?.length);

    if (data && data.recentTrades && data.recentTrades.length > 0) {
      console.log('[Portal DEBUG] ✅ Using REAL DATA with', data.recentTrades.length, 'trades!');
      // Use real data - show first trade or all if showAllTrades is true
      return showAllTrades ? data.recentTrades : [data.recentTrades[0]];
    }
    console.log('[Portal DEBUG] ❌ Falling back to DUMMY data');
    // Fallback to dummy data
    const dummyTrades = getDummyTrades();
    return [dummyTrades[0]];
  };

  // Get blurred trades (use real data if available)
  const getBlurredTrades = () => {
    if (data && data.recentTrades && data.recentTrades.length > 1) {
      // Show trades 2-4 as blurred from real data
      return data.recentTrades.slice(1, 4);
    }
    // Fallback to dummy data
    const dummyTrades = getDummyTrades();
    return dummyTrades.slice(1, 4);
  };

  // Mock recent recommendations
  const recentRecommendations = [
    {
      handle: '@elonmusk',
      date: '2 hours ago',
      winRate: '68%',
      avgReturn: '+12.4%',
      totalCalls: 156,
    },
    {
      handle: '@cathiedwood',
      date: '1 day ago',
      winRate: '72%',
      avgReturn: '+18.2%',
      totalCalls: 89,
    },
    {
      handle: '@chamath',
      date: '3 days ago',
      winRate: '65%',
      avgReturn: '+9.8%',
      totalCalls: 124,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Left Sidebar */}
      <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/alphahandle-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Main Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ hovered }) => [
                styles.menuItem,
                hovered && styles.menuItemHover,
              ]}
              onPress={() => setActiveTab(item.id)}
            >
              <View style={styles.menuIconContainer}>
                {item.isCustomIcon ? (
                  <MagnifyingGlassIcon
                    color={activeTab === item.id ? '#635BFF' : '#697386'}
                    size={16}
                  />
                ) : (
                  <Text style={[styles.menuIcon, activeTab === item.id && styles.menuIconActive]}>
                    {item.icon}
                  </Text>
                )}
              </View>
              <Text style={[styles.menuLabel, activeTab === item.id && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bottom Section - Plan Info */}
        <View style={styles.bottomSection}>
          {/* Need Support */}
          <Pressable style={styles.supportButton}>
            <View style={styles.supportIconContainer}>
              <Text style={styles.supportIcon}>?</Text>
            </View>
            <Text style={styles.supportText}>Need Support</Text>
          </Pressable>

          {/* Plan Card */}
          <View style={styles.planCard}>
            <Text style={styles.planName}>{planData.name}</Text>

            {user && (
              <>
                <View style={styles.usageInfo}>
                  <Text style={styles.usageText}>
                    {planData.searchesUsed} / {planData.searchesTotal} searches used
                  </Text>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${searchesProgress}%` }]} />
                </View>
              </>
            )}

            <Pressable
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Pricing')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </Pressable>
          </View>

          {/* User Profile or Sign In/Register Buttons */}
          {user ? (
            <Pressable style={styles.userSection} onPress={handleSignOut}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getUserInitial()}</Text>
                </View>
                <Text style={styles.userName} numberOfLines={1}>
                  {getUserDisplay()}
                </Text>
              </View>
              <View style={styles.signOutButton}>
                <SignOutIcon color="#697386" size={16} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.authDropdownContainer}>
              <Pressable
                style={styles.authDropdownButton}
                onPress={() => setShowAuthDropdown(!showAuthDropdown)}
              >
                <Text style={styles.authDropdownButtonText}>Sign In / Register</Text>
                <ChevronIcon direction={showAuthDropdown ? 'down' : 'up'} color="#697386" size={10} />
              </Pressable>

              {showAuthDropdown && (
                <View style={styles.authDropdownMenu}>
                  <Pressable
                    style={styles.authDropdownMenuItem}
                    onPress={() => {
                      setShowAuthDropdown(false);
                      navigation.navigate('SignIn', { redirectTo: 'Portal' });
                    }}
                  >
                    <Text style={styles.authDropdownMenuItemText}>Sign In</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.authDropdownMenuItem, styles.authDropdownMenuItemLast]}
                    onPress={() => {
                      setShowAuthDropdown(false);
                      navigation.navigate('SignUp', { redirectTo: 'Portal' });
                    }}
                  >
                    <Text style={styles.authDropdownMenuItemText}>Register</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.mainContentContainer}>
        {activeTab === 'analyzer' && (
          <View style={styles.contentSection}>
            {/* Header */}
            <View style={styles.analyzerHeader}>
              <Text style={styles.headerTitle}>Handle Analyzer</Text>
              <Text style={styles.headerSubtitle}>
                Analyze any FinTwit account to reveal verified performance metrics
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter Twitter handle (e.g., @elonmusk)"
                  placeholderTextColor="#9aa3af"
                  value={twitterHandle}
                  onChangeText={setTwitterHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleAnalyze}
                />
                <PrimaryButton onPress={handleAnalyze} style={styles.analyzeButtonOverride}>
                  Analyze
                </PrimaryButton>
              </View>
            </View>

            {/* Loading State */}
            {analysisLoading && !data && (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="large" color="#635BFF" />
                <Text style={styles.loadingTextAnalysis}>Analyzing {twitterHandle}...</Text>
              </View>
            )}

            {/* Results Section */}
            {data && (
              <Animated.View style={{ opacity: fadeAnim }}>
                {/* Refreshing Indicator */}
                {isRefreshing && (
                  <View style={styles.refreshingIndicator}>
                    <ActivityIndicator size="small" color="#635BFF" />
                    <Text style={styles.refreshingText}>Refreshing...</Text>
                  </View>
                )}

                {/* Title Section */}
                <View style={styles.titleSection}>
                  <Text style={styles.resultsTitle}>Track Record of {data.handle}</Text>
                </View>

                {/* Metrics Grid with Timeline Dropdown */}
                <View style={styles.metricsGridWithDropdown}>
                  {/* Timeline Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <Pressable
                      style={styles.dropdownButton}
                      onPress={() => setShowDropdown(!showDropdown)}
                    >
                      <View>
                        <Text style={styles.metricLabel}>SHOW</Text>
                        <Text style={styles.dropdownButtonText}>Last 6 Months</Text>
                      </View>
                      <ChevronIcon direction={showDropdown ? 'up' : 'down'} color="#6B7C93" size={10} />
                    </Pressable>

                    {showDropdown && (
                      <View style={styles.dropdownMenu}>
                        {['Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Last 24 Months'].map((tf) => (
                          <Pressable
                            key={tf}
                            style={[
                              styles.dropdownItem,
                              tf === 'Last 6 Months' && styles.dropdownItemActive
                            ]}
                            onPress={() => {
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              tf === 'Last 6 Months' && styles.dropdownItemTextActive
                            ]}>
                              {tf}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Metrics Grid */}
                  <View style={styles.metricsGrid}>
                    {/* Return Card */}
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Return</Text>
                      <Text style={[
                        styles.metricValue,
                        styles.largeMetric,
                        { color: data.avgReturn >= 0 ? '#00D924' : '#FF6B6B' }
                      ]}>
                        {data.avgReturn >= 0 ? '+' : ''}{data.avgReturn.toFixed(1)}%
                      </Text>
                    </View>

                    {/* Alpha Card */}
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Alpha</Text>
                      <Text style={[
                        styles.metricValue,
                        styles.largeMetric,
                        { color: data.alpha >= 0 ? '#00D924' : '#FF6B6B' }
                      ]}>
                        {data.alpha >= 0 ? '+' : ''}{data.alpha.toFixed(1)}%
                      </Text>
                    </View>

                    {/* Hit Ratio Card */}
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Hit Ratio</Text>
                      <Text style={[styles.metricValue, styles.largeMetric]}>{data.hitRatio.toFixed(1)}%</Text>
                    </View>
                  </View>
                </View>

                {/* Recent Recommendations Table */}
                <View style={styles.tableSection}>
                  <View style={styles.resultsTable}>
                    {/* Table Header */}
                    <View style={styles.resultsTableHeader}>
                      <Text style={[styles.tableHeaderText, styles.colTicker]}>Ticker</Text>
                      <Text style={[styles.tableHeaderText, styles.colCompany]}>Company</Text>
                      <Text style={[styles.tableHeaderText, styles.colDate]}>DATE POST</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Begin</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Last</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Return</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Alpha</Text>
                      <Text style={[styles.tableHeaderText, styles.colHit]}>Hit/Miss</Text>
                    </View>

                    {/* Clear Table Row */}
                    {getVisibleTrades().map((trade, index) => (
                      <View
                        key={index}
                        style={[
                          styles.resultsTableRow,
                          index % 2 === 1 && styles.tableRowZebra,
                        ]}
                      >
                        <Text style={[styles.tableCell, styles.tableTickerCell, styles.colTicker]}>
                          {trade.ticker}
                        </Text>
                        <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                        <View style={[styles.tableCell, styles.colDate, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                          <Text>{trade.dateMentioned}</Text>
                          <TouchableOpacity onPress={() => Linking.openURL(trade.tweetUrl)}>
                            <ExternalLinkIcon size={14} color="#007AFF" />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                          ${trade.beginningValue.toFixed(0)}
                        </Text>
                        <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                          ${trade.lastValue.toFixed(0)}
                        </Text>
                        <Text style={[
                          styles.tableCell,
                          styles.numericCell,
                          styles.colReturn,
                          trade.stockReturn >= 0 ? styles.positiveReturn : styles.negativeReturn
                        ]}>
                          {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                        </Text>
                        <Text style={[
                          styles.tableCell,
                          styles.numericCell,
                          styles.colReturn,
                          trade.alphaVsSPY >= 0 ? styles.positiveAlpha : styles.negativeAlpha
                        ]}>
                          {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                        </Text>
                        <Text style={[
                          styles.tableCell,
                          styles.colHit,
                          trade.hitOrMiss === 'Hit' ? styles.hitText : styles.missText
                        ]}>
                          {trade.hitOrMiss}
                        </Text>
                      </View>
                    ))}

                    {/* Blurred Table Rows with See More Button */}
                    {!showAllTrades && (
                      <>
                        {/* First blurred row - visible above button */}
                        {getBlurredTrades().slice(0, 1).map((trade, index) => (
                          <View
                            key={`blurred-${index}`}
                            style={[
                              styles.resultsTableRow,
                              styles.blurredRow,
                              (index + 1) % 2 === 1 && styles.tableRowZebra,
                            ]}
                          >
                            <Text style={[styles.tableCell, styles.tableTickerCell, styles.colTicker]}>
                              {trade.ticker}
                            </Text>
                            <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                            <View style={[styles.tableCell, styles.colDate, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <Text>{trade.dateMentioned}</Text>
                              <TouchableOpacity onPress={() => Linking.openURL(trade.tweetUrl)}>
                                <Text style={{ fontSize: 14, color: '#007AFF' }}>↗</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                              ${trade.beginningValue.toFixed(0)}
                            </Text>
                            <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                              ${trade.lastValue.toFixed(0)}
                            </Text>
                            <Text style={[
                              styles.tableCell,
                              styles.numericCell,
                              styles.colReturn,
                              trade.stockReturn >= 0 ? styles.positiveReturn : styles.negativeReturn
                            ]}>
                              {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                            </Text>
                            <Text style={[
                              styles.tableCell,
                              styles.numericCell,
                              styles.colReturn,
                              trade.alphaVsSPY >= 0 ? styles.positiveAlpha : styles.negativeAlpha
                            ]}>
                              {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                            </Text>
                            <Text style={[
                              styles.tableCell,
                              styles.colHit,
                              trade.hitOrMiss === 'Hit' ? styles.hitText : styles.missText
                            ]}>
                              {trade.hitOrMiss}
                            </Text>
                          </View>
                        ))}

                        {/* Blurred Section with remaining rows behind button */}
                        <View style={styles.blurredSection}>
                          {/* Remaining 2 blurred rows */}
                          {getBlurredTrades().slice(1).map((trade, index) => (
                            <View
                              key={`blurred-${index + 1}`}
                              style={[
                                styles.resultsTableRow,
                                styles.blurredRow,
                                (index + 2) % 2 === 1 && styles.tableRowZebra,
                              ]}
                            >
                              <Text style={[styles.tableCell, styles.tableTickerCell, styles.colTicker]}>
                                {trade.ticker}
                              </Text>
                              <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                              <View style={[styles.tableCell, styles.colDate, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <Text>{trade.dateMentioned}</Text>
                                <TouchableOpacity onPress={() => Linking.openURL(trade.tweetUrl)}>
                                  <Text style={{ fontSize: 14, color: '#007AFF' }}>↗</Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                                ${trade.beginningValue.toFixed(0)}
                              </Text>
                              <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                                ${trade.lastValue.toFixed(0)}
                              </Text>
                              <Text style={[
                                styles.tableCell,
                                styles.numericCell,
                                styles.colReturn,
                                trade.stockReturn >= 0 ? styles.positiveReturn : styles.negativeReturn
                              ]}>
                                {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                              </Text>
                              <Text style={[
                                styles.tableCell,
                                styles.numericCell,
                                styles.colReturn,
                                trade.alphaVsSPY >= 0 ? styles.positiveAlpha : styles.negativeAlpha
                              ]}>
                                {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                              </Text>
                              <Text style={[
                                styles.tableCell,
                                styles.colHit,
                                trade.hitOrMiss === 'Hit' ? styles.hitText : styles.missText
                              ]}>
                                {trade.hitOrMiss}
                              </Text>
                            </View>
                          ))}

                          {/* See More Button Overlay - starts at row 2 */}
                          <View style={styles.seeMoreOverlay}>
                            <Pressable
                              style={styles.seeMoreButton}
                              onPress={handleSeeMore}
                            >
                              <LockIcon color="#FFFFFF" size={16} />
                              <Text style={styles.seeMoreButtonText}>Unlock to see more</Text>
                            </Pressable>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        )}

        {activeTab === 'favourites' && (
          <View style={styles.contentSection}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Favourites</Text>
              <Text style={styles.headerSubtitle}>
                Your saved analyses and favorite accounts
              </Text>
            </View>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>★</Text>
              <Text style={styles.emptyStateText}>No favourites yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Star accounts to save them here for quick access
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'share' && (
          <View style={styles.contentSection}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Share on X & earn</Text>
              <Text style={styles.headerSubtitle}>
                Share on X (Twitter) and earn additional search credits
              </Text>
            </View>
            <View style={styles.referralCard}>
              <Text style={styles.referralTitle}>Your Referral Link</Text>
              <View style={styles.referralLinkContainer}>
                <Text style={styles.referralLink}>https://alphahandle.com/ref/abc123</Text>
                <Pressable style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>Copy</Text>
                </Pressable>
              </View>
              <Text style={styles.referralNote}>
                Earn 5 additional searches for each friend who signs up with your link
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    height: '100vh',
    overflow: 'hidden',
  },

  // Sidebar - Stripe light theme
  sidebar: {
    width: 240,
    backgroundColor: '#F7F9FB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: '#E6EBF1',
    height: '100vh',
  },
  sidebarMobile: {
    width: 200,
  },

  // Logo Section
  logoSection: {
    marginBottom: 24,
    paddingBottom: 16,
  },
  logoContainer: {
    paddingVertical: 4,
  },
  logoImage: {
    height: 32,
    width: 168,
  },

  // Menu Items
  menuSection: {
    gap: 2,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 12,
  },
  menuItemHover: {
    backgroundColor: '#E6EBF1',
  },
  menuIconContainer: {
    width: 18,
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 16,
    color: '#697386',
  },
  menuIconActive: {
    color: '#635BFF',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F566B',
  },
  menuLabelActive: {
    color: '#635BFF',
    fontWeight: '600',
  },

  // Bottom Section
  bottomSection: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF1',
    flexShrink: 0,
  },

  // Support Button
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 6,
  },
  supportIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E3E8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#697386',
  },
  supportText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F566B',
  },

  // Plan Card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E6EBF1',
  },
  planName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F566B',
    marginBottom: 2,
  },
  usageInfo: {
    marginBottom: 4,
  },
  usageText: {
    fontSize: 11,
    color: '#697386',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F4F8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#635BFF',
    borderRadius: 2,
  },
  upgradeButton: {
    backgroundColor: '#635BFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // User Section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6EBF1',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#635BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0A2540',
    flex: 1,
  },
  signOutButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Auth Dropdown (for non-authenticated users)
  authDropdownContainer: {
    position: 'relative',
    zIndex: 2000,
  },
  authDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6EBF1',
  },
  authDropdownButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F566B',
  },
  authDropdownArrow: {
    fontSize: 12,
    color: '#697386',
    marginLeft: 8,
  },
  authDropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    zIndex: 2001,
  },
  authDropdownMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
  },
  authDropdownMenuItemLast: {
    borderBottomWidth: 0,
  },
  authDropdownMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F566B',
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#F6F9FC',
    height: '100vh',
    overflow: 'auto',
  },
  mainContentContainer: {
    padding: 32,
  },
  contentSection: {
    flex: 1,
  },

  // Header
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#425466',
    lineHeight: 24,
  },

  // Search Section
  searchSection: {
    marginBottom: 32,
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7f8fb',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    padding: 6,
    alignItems: 'center',
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#0b0b0c',
    height: 42,
    backgroundColor: 'transparent',
  },
  analyzeButtonOverride: {
    marginBottom: 0,
  },

  // Recent Section
  recentSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 20,
  },

  // Table
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#425466',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F9FC',
  },
  tableCell: {
    fontSize: 14,
    color: '#0A2540',
  },
  handleColumn: {
    flex: 2,
  },
  metricColumn: {
    flex: 1,
  },
  dateColumn: {
    flex: 1.5,
  },
  handleText: {
    fontWeight: '600',
    color: '#635BFF',
  },
  metricValue: {
    fontWeight: '600',
  },
  positiveValue: {
    fontWeight: '600',
    color: '#00D924',
  },
  dateText: {
    color: '#8A94A6',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#425466',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8A94A6',
    textAlign: 'center',
    maxWidth: 400,
  },

  // Referral Card
  referralCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    padding: 32,
    maxWidth: 600,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 16,
  },
  referralLinkContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  referralLink: {
    flex: 1,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#425466',
  },
  copyButton: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  referralNote: {
    fontSize: 13,
    color: '#8A94A6',
    lineHeight: 20,
  },

  // Analysis Results Styles
  analyzerHeader: {
    marginBottom: 16,
  },
  loadingSection: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingTextAnalysis: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7C93',
    fontWeight: '500',
  },
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#635BFF',
    fontWeight: '500',
  },
  titleSection: {
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F36',
    letterSpacing: -0.3,
  },
  handleTextResults: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635BFF',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#6B7C93',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
  },
  metricCard: {
    flex: 1,
    minWidth: 165,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 0,
  },
  largeMetric: {
    fontSize: 16,
    lineHeight: 18,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E3E8EF',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#635BFF',
    borderRadius: 3,
  },
  tableSection: {
    marginBottom: 16,
  },
  sectionTitleResults: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  resultsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  resultsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E3E8EF',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
  },
  numericHeader: {
    textAlign: 'right',
  },
  resultsTableRow: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
  },
  tableRowZebra: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    fontSize: 12,
    color: '#1A1F36',
    paddingHorizontal: 6,
    fontFamily: 'System',
  },
  numericCell: {
    textAlign: 'right',
  },
  tableTickerCell: {
    fontWeight: '700',
    color: '#635BFF',
  },
  positiveReturn: {
    color: '#00D924',
    fontWeight: '600',
  },
  negativeReturn: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  positiveAlpha: {
    color: '#00D924',
    fontWeight: '600',
  },
  negativeAlpha: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  hitText: {
    color: '#00D924',
    fontWeight: '600',
  },
  missText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  tweetLinkCell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tweetLinkIcon: {
    fontSize: 14,
  },

  // Blurred Section
  blurredSection: {
    position: 'relative',
  },
  blurredRow: {
    opacity: 0.5,
    filter: 'blur(2px)',
  },
  seeMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  seeMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  seeMoreHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#4F566B',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Metrics Grid with Dropdown
  metricsGridWithDropdown: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },

  // Dropdown Styles
  dropdownContainer: {
    flex: 0,
    minWidth: 165,
    maxWidth: 165,
    zIndex: 1000,
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    height: 42,
  },
  dropdownButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1F36',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6B7C93',
    marginLeft: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  dropdownItemActive: {
    backgroundColor: '#F6F9FC',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#1A1F36',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#635BFF',
  },

  // Table Column Widths
  colTicker: {
    flex: 0.7,
  },
  colCompany: {
    flex: 1.8,
  },
  colDate: {
    flex: 1,
  },
  colValue: {
    flex: 0.9,
  },
  colDividend: {
    flex: 0.7,
  },
  colReturn: {
    flex: 0.9,
  },
  colHit: {
    flex: 0.8,
  },
  colTweet: {
    flex: 0.5,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
  },
  loadingText: {
    fontSize: 16,
    color: '#425466',
  },
});
