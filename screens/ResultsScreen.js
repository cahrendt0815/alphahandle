import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Linking } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { analyzeHandle, getCachedAnalysis } from '../services/fintwitService';
import { useAuth } from '../auth/AuthProvider';
import { getEntitlementForUser, hasFullAccess } from '../services/entitlements';
import BlurReveal from '../components/BlurReveal';

export default function ResultsScreen({ route, navigation }) {
  const { handle } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [timeframe, setTimeframe] = useState('Last 6 Months');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { user } = useAuth();
  const timeframes = ['Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Last 24 Months'];

  // Filter trades to last 6 months and limit visibility
  const getVisibleTrades = () => {
    if (!data?.recentTrades) return [];

    // Filter to last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const filteredTrades = data.recentTrades.filter(trade => {
      const tradeDate = new Date(trade.dateMentioned);
      return tradeDate >= sixMonthsAgo;
    });

    // Show only first 3 unless user has unlocked
    if (!showAllTrades) {
      return filteredTrades.slice(0, 3);
    }

    return filteredTrades;
  };

  const handleSeeMore = async () => {
    console.log('[ResultsScreen] See more clicked');

    // Not authenticated? Navigate to sign in with redirect back to Results
    if (!user) {
      console.log('[ResultsScreen] User not authenticated, navigating to sign in');
      navigation.navigate('SignIn', { redirectTo: 'Results', handle });
      return;
    }

    // Authenticated but no plan? Navigate to pricing with redirect context
    const entitlement = await getEntitlementForUser(user);

    if (!hasFullAccess(entitlement)) {
      console.log('[ResultsScreen] User has no plan, navigating to pricing');
      navigation.navigate('Pricing', { redirectTo: 'Results', handle });
      return;
    }

    // Has plan? Show all trades
    console.log('[ResultsScreen] User has access, showing all trades');
    setShowAllTrades(true);
  };

  useEffect(() => {
    let mounted = true;

    // Step 1: Try to fetch cached data first for instant display
    getCachedAnalysis(handle).then((cachedData) => {
      if (cachedData && mounted) {
        console.log('[ResultsScreen] Showing cached data');
        setData(cachedData);
        setLoading(false);

        // Animate fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();

        // Indicate refreshing in background
        setIsRefreshing(true);
      }

      // Step 2: Fetch fresh analysis in background
      return analyzeHandle(handle);
    }).then((freshData) => {
      if (mounted) {
        console.log('[ResultsScreen] Updating with fresh data');
        setData(freshData);
        setLoading(false);
        setIsRefreshing(false);

        // Animate fade-in if this is first data
        if (fadeAnim._value === 0) {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }
      }
    }).catch((error) => {
      console.error('[ResultsScreen] Error fetching analysis:', error);
      if (mounted) {
        setLoading(false);
        setIsRefreshing(false);
        setSaveError('Could not load analysis');
      }
    });

    return () => {
      mounted = false;
    };
  }, [handle]);

  if (loading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Analyzing {handle}...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          {isRefreshing && (
            <View style={styles.refreshingIndicator}>
              <ActivityIndicator size="small" color="#635BFF" />
              <Text style={styles.refreshingText}>Refreshing...</Text>
            </View>
          )}
          {saveError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Performance Summary</Text>
            <Text style={styles.handleText}>{data.handle}</Text>
            <Text style={styles.lastUpdated}>Last updated: {data.lastUpdated}</Text>
          </View>

          {/* Metrics Grid with Dropdown - 3 KPIs + Dropdown */}
          <View style={styles.metricsGridWithDropdown}>
            {/* Timeframe Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>TIMEFRAME</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={styles.dropdownButtonText}>{timeframe}</Text>
                <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownMenu}>
                  {timeframes.map((tf) => (
                    <TouchableOpacity
                      key={tf}
                      style={[
                        styles.dropdownItem,
                        tf === timeframe && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        setTimeframe(tf);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        tf === timeframe && styles.dropdownItemTextActive
                      ]}>
                        {tf}
                      </Text>
                    </TouchableOpacity>
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
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${data.hitRatio}%` }]} />
              </View>
            </View>
          </View>
          </View>

          {/* Recent Recommendations Table */}
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>Recent Recommendations</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colTicker]}>Ticker</Text>
                <Text style={[styles.tableHeaderText, styles.colCompany]}>Company</Text>
                <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Begin</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Last</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colDividend]}>Div</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Adj Last</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Return</Text>
                <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Alpha</Text>
                <Text style={[styles.tableHeaderText, styles.colHit]}>Hit/Miss</Text>
                <Text style={[styles.tableHeaderText, styles.colTweet]}>🔗</Text>
              </View>

              {/* Table Rows */}
              {getVisibleTrades().map((trade, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.tableRowZebra,
                    index === data.recentTrades.length - 1 && styles.tableRowLast
                  ]}
                >
                  <Text style={[styles.tableCell, styles.tableTickerCell, styles.colTicker]}>
                    {trade.ticker}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                  <Text style={[styles.tableCell, styles.colDate]}>{trade.dateMentioned}</Text>
                  <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                    ${trade.beginningValue.toFixed(0)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                    ${trade.lastValue.toFixed(0)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numericCell, styles.colDividend]}>
                    ${trade.dividends.toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numericCell, styles.colValue]}>
                    ${trade.adjLastValue.toFixed(0)}
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
                  <TouchableOpacity
                    style={[styles.tweetLinkCell, styles.colTweet]}
                    onPress={() => Linking.openURL(trade.tweetUrl)}
                  >
                    <Text style={styles.tweetLinkIcon}>🔗</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Blur Reveal Paywall - show if not all trades visible */}
              {!showAllTrades && data.recentTrades.length > 3 && (
                <BlurReveal onSeeMore={handleSeeMore} />
              )}
            </View>
          </View>

          {/* Best/Worst Trades Section */}
          <View style={styles.tradesSection}>
            <Text style={styles.sectionTitle}>Best & Worst Trades</Text>
            <View style={styles.tradesGrid}>
              {/* Best Trade */}
              <View style={[styles.tradeCard, styles.bestTradeCard]}>
                <Text style={styles.tradeLabel}>🏆 Best Trade</Text>
                <Text style={styles.tradeTicker}>{data.bestTrade.ticker}</Text>
                <Text style={[styles.tradeReturn, { color: '#00D924' }]}>
                  {data.bestTrade.return}
                </Text>
                <Text style={styles.tradeDate}>{data.bestTrade.date}</Text>
              </View>

              {/* Worst Trade */}
              <View style={[styles.tradeCard, styles.worstTradeCard]}>
                <Text style={styles.tradeLabel}>📉 Worst Trade</Text>
                <Text style={styles.tradeTicker}>{data.worstTrade.ticker}</Text>
                <Text style={[styles.tradeReturn, { color: '#FF6B6B' }]}>
                  {data.worstTrade.return}
                </Text>
                <Text style={styles.tradeDate}>{data.worstTrade.date}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.primaryButtonText}>Analyze Another Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} disabled>
              <Text style={styles.secondaryButtonText}>View Full Report (Coming Soon)</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data is for demonstration purposes only. Real analysis coming soon.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7C93',
    fontWeight: '500',
  },

  // Header
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
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F6F9FC',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#635BFF',
    fontWeight: '500',
  },
  errorBanner: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },

  // Main Container
  container: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Title Section
  titleSection: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 12,
    letterSpacing: -1,
  },
  handleText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#635BFF',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7C93',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    flex: 1,
  },
  metricCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 4,
  },
  largeMetric: {
    fontSize: 40,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E3E8EF',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#635BFF',
    borderRadius: 4,
  },

  // Table Section
  tableSection: {
    marginBottom: 64,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  tableScrollContainer: {
    width: '100%',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E3E8EF',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
  },
  numericHeader: {
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
  },
  tableRowZebra: {
    backgroundColor: '#FAFBFC',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 13,
    color: '#1A1F36',
    paddingHorizontal: 8,
    fontFamily: 'System',
  },
  numericCell: {
    textAlign: 'right',
    fontFamily: 'Courier New',
    fontVariant: ['tabular-nums'],
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
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tweetLinkIcon: {
    fontSize: 16,
  },

  // Trades Section
  tradesSection: {
    marginBottom: 64,
  },
  tradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  tradeCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
  },
  bestTradeCard: {
    borderColor: '#00D924',
    backgroundColor: 'rgba(0, 217, 36, 0.05)',
  },
  worstTradeCard: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  tradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7C93',
    marginBottom: 16,
  },
  tradeTicker: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 8,
  },
  tradeReturn: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tradeDate: {
    fontSize: 13,
    color: '#99B3C9',
  },

  // Actions Section
  actionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 64,
  },
  primaryButton: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#635BFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#F6F9FC',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  secondaryButtonText: {
    color: '#99B3C9',
    fontSize: 16,
    fontWeight: '600',
  },

  // Metrics Grid with Dropdown
  metricsGridWithDropdown: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 64,
    alignItems: 'flex-start',
  },

  // Dropdown Styles
  dropdownContainer: {
    flex: 0,
    minWidth: 240,
    maxWidth: 240,
    zIndex: 1000,
    position: 'relative',
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7C93',
    marginLeft: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  dropdownItemActive: {
    backgroundColor: '#F6F9FC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1F36',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#635BFF',
  },

  // Table Column Widths
  colTicker: {
    flex: 0.8,
  },
  colCompany: {
    flex: 2,
  },
  colDate: {
    flex: 1.2,
  },
  colValue: {
    flex: 1,
  },
  colDividend: {
    flex: 0.8,
  },
  colReturn: {
    flex: 1,
  },
  colHit: {
    flex: 1,
  },
  colTweet: {
    flex: 0.6,
  },

  // Footer
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
  },
  footerText: {
    fontSize: 13,
    color: '#99B3C9',
    textAlign: 'center',
  },
});
