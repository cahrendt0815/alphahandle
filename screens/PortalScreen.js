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
import ExportIcon from '../components/ExportIcon';
import EmptyStateIcon from '../components/EmptyStateIcon';
import TrendingUpIcon from '../components/TrendingUpIcon';
import ChartBarIcon from '../components/ChartBarIcon';
import TargetIcon from '../components/TargetIcon';
import StarIcon from '../components/StarIcon';
import MiniChart from '../components/MiniChart';
import { analyzeHandle, getCachedAnalysis} from '../services/fintwitService';
import { ANALYSIS_BASE_URL } from '../lib/appEnv';
import { addFavorite, listFavorites } from '../services/favorites';
import { analyzeHandleIncremental } from '../services/incrementalAnalysis';
import { fetchProfileImage } from '../services/profileCache';
import { getEntitlementForUser, hasFullAccess } from '../services/entitlements';
import BlurReveal from '../components/BlurReveal';
import Card from '../components/ui/Card';
import { Stat } from '../components/ui/Stat';
import { colors } from '../theme/tokens';
import { appStyles } from '../theme/styles';

// Helper function to format date as "Aug 19, 2025"
function formatDate(dateString) {
  if (!dateString) return 'Unknown Date';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export default function PortalScreen({ navigation, route }) {
  const { user, signOut, loading } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeTab, setActiveTab] = useState('analyzer');
  const [twitterHandle, setTwitterHandle] = useState('');

  // Analysis state
  const [data, setData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showBenchmarkDropdown, setShowBenchmarkDropdown] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('Last 6 Months');
  const [selectedSort, setSelectedSort] = useState('Newest');
  const [selectedBenchmark, setSelectedBenchmark] = useState('S&P 500');
  const [userEntitlement, setUserEntitlement] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Incremental loading state
  const [visibleTradesCount, setVisibleTradesCount] = useState(10);
  const [allTrades, setAllTrades] = useState([]);
  const [analysisCompleted, setAnalysisCompleted] = useState(false); // Track if analysis has completed (even if 0 trades)
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  // Favourites state
  const [favourites, setFavourites] = useState([]);
  const [favSortKey, setFavSortKey] = useState('handle'); // handle|return|alpha|hit
  const [favSortDir, setFavSortDir] = useState('asc'); // asc|desc

  // Get handle from route params if provided
  const routeHandle = route.params?.handle;

  // Track if we've already loaded analysis to prevent duplicate loads
  const hasLoadedRef = useRef(false);

  // Load analysis if handle is provided in route params
  useEffect(() => {
    console.log('[Portal] useEffect fired - routeHandle:', routeHandle, 'user:', user?.email, 'hasLoadedRef:', hasLoadedRef.current);

    // Prevent duplicate loads in React Strict Mode
    if (hasLoadedRef.current && routeHandle) {
      console.log('[Portal] useEffect already processed, skipping to prevent duplicate load');
      return;
    }

    if (routeHandle) {
      console.log('[Portal] ✅ Handle detected from route params:', routeHandle);
      setTwitterHandle(routeHandle);
      hasLoadedRef.current = true;

      // Call loadAnalysis immediately - it will handle waiting for user if needed
      loadAnalysis(routeHandle);
    } else {
      console.log('[Portal] ⚠️ No handle provided in route params');
    }
  }, [routeHandle]);

  // Load favourites when tab opens or user changes
  useEffect(() => {
    const loadFavs = async () => {
      const uid = user?.id || 'anon';
      const list = await listFavorites(uid);
      setFavourites(list);
    };
    if (activeTab === 'favourites') {
      loadFavs();
    }
  }, [activeTab, user]);

  // Check user's entitlements and auto-unlock if they have access
  useEffect(() => {
    async function checkAccess() {
      if (user) {
        const entitlement = await getEntitlementForUser(user);
        const hasAccess = hasFullAccess(entitlement);
        console.log('[Portal] User entitlement:', entitlement);
        console.log('[Portal] Has full access:', hasAccess);

        // Store entitlement in state for displaying usage data
        setUserEntitlement(entitlement);

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
    setAnalysisError(null); // Clear previous errors
    setAnalysisCompleted(false); // Reset analysis completed flag
    setVisibleTradesCount(10); // Reset to show first 10
    setAllTrades([]);
    setProcessingProgress(0);
    setProcessingStatus('');

    try {
      // Get user's entitlement to determine timeline months
      const entitlement = user ? await getEntitlementForUser(user) : null;
      const timelineMonths = 36; // Fetch 3 years of tweets (maximum realistic timeframe)

      console.log(`[Portal] Analyzing with ${timelineMonths} months timeline (plan: ${entitlement?.plan || 'free'})`);

      // Fetch profile data (cached for 3 months)
      const profile = await fetchProfileImage(handle);
      if (profile && mounted) {
        setProfileData(profile);
      }

      // Try cached data from previous searches
      const cachedData = await getCachedAnalysis(handle);
      if (cachedData && mounted) {
        console.log('[Portal] Showing cached data');
        setData(cachedData);
        setAllTrades(cachedData.recentTrades || []);
        setAnalysisLoading(false);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();

        setIsRefreshing(true);
      }

      // Call server-side analysis endpoint with progressive loading
      console.log(`[Portal] Calling analysis server at ${ANALYSIS_BASE_URL}/api/analyze?handle=${encodeURIComponent(handle)}&months=${timelineMonths}`);
      
      // Dynamic timeout based on months requested: 60s for 12 months, +30s per additional 12 months
      const timeoutMs = Math.min(180000, 60000 + Math.ceil(timelineMonths / 12) * 30000); // Max 3 minutes
      console.log(`[Portal] Using timeout: ${timeoutMs / 1000}s for ${timelineMonths} months`);
      
      let analysisResponse;
      try {
        analysisResponse = await fetch(`${ANALYSIS_BASE_URL}/api/analyze?handle=${encodeURIComponent(handle)}&months=${timelineMonths}`, {
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (fetchError) {
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          throw new Error(`Analysis timeout after ${timeoutMs / 1000}s. For ${timelineMonths} months, this may take longer. The analysis server may still be processing. Try refreshing in a moment.`);
        }
        if (fetchError.message && (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ECONNREFUSED'))) {
          throw new Error(`Cannot connect to analysis server at ${ANALYSIS_BASE_URL}. Please start it with: npm run dev:analysis`);
        }
        throw fetchError;
      }

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text().catch(() => 'Unknown error');
        throw new Error(`Analysis server error ${analysisResponse.status}: ${errorText.substring(0, 200)}`);
      }

      const analysisData = await analysisResponse.json();
      console.log(`[Portal] ✅ First batch complete:`, analysisData);
      console.log(`[Portal DEBUG] analysisData.trades:`, analysisData.trades);
      console.log(`[Portal DEBUG] analysisData.trades.length:`, analysisData.trades?.length);
      console.log(`[Portal DEBUG] analysisData.stats:`, analysisData.stats);

      if (!mounted) return;

      // Store session ID for polling
      if (analysisData.sessionId) {
        setSessionId(analysisData.sessionId);
      }

      // Update UI with first batch results
      setData({
        avgReturn: analysisData.stats.avgReturn,
        alpha: analysisData.stats.alpha,
        winRate: analysisData.stats.winRate,
        hitRatio: analysisData.stats.hitRatio,
        totalTrades: analysisData.stats.totalTrades
      });

      setAllTrades(analysisData.trades);
      setHasMoreResults(analysisData.hasMore || false);
      setAnalysisLoading(false);
      setAnalysisCompleted(true); // Mark analysis as completed
      setIsRefreshing(analysisData.hasMore); // Keep showing refreshing indicator if more results coming

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // If there are more results coming, start polling for them
      if (analysisData.hasMore && analysisData.sessionId) {
        console.log(`[Portal] More results available. Starting background polling...`);
        setProcessingStatus('Processing remaining tweets...');
        pollForMoreResults(analysisData.sessionId, mounted);
      } else {
        setProcessingStatus('');
      }

      // Update entitlements
      if (user) {
        getEntitlementForUser(user).then(updated => {
          setUserEntitlement(updated);
          console.log('[Portal] Updated search usage:', updated.searches_used, '/', updated.searches_quota);
        });
      }

    } catch (error) {
      console.error('[Portal] Error fetching analysis:', error);
      if (mounted) {
        setAnalysisLoading(false);
        setIsRefreshing(false);
        setProcessingStatus('');
        setAnalysisError(error.message || 'Failed to fetch analysis. Make sure the analysis server is running.');
      }
    }

    return () => {
      mounted = false;
    };
  };

  // Poll for additional results from background processing
  const pollForMoreResults = async (sid, mounted) => {
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`[Portal] Polling for more results (attempt ${attempts}/${maxAttempts})...`);

        const response = await fetch(`http://localhost:8002/api/analyze/results/${sid}`);

        if (!response.ok) {
          console.error(`[Portal] Polling error: ${response.status}`);
          return;
        }

        const data = await response.json();
        console.log(`[Portal] Poll result:`, data);

        if (!mounted) return;

        // Update UI with latest results
        if (data.trades && data.trades.length > 0) {
          setAllTrades(data.trades);
          setData({
            avgReturn: data.stats.avgReturn,
            alpha: data.stats.alpha,
            winRate: data.stats.winRate,
            hitRatio: data.stats.hitRatio,
            totalTrades: data.stats.totalTrades
          });
        }

        // Check if processing is complete
        if (data.status === 'complete') {
          console.log(`[Portal] ✅ Background processing complete! Total trades: ${data.trades.length}`);
          setIsRefreshing(false);
          setProcessingStatus('');
          setAnalysisCompleted(true); // Ensure flag is set when polling completes
          setHasMoreResults(false);
          return;
        }

        // Check if there was an error
        if (data.status === 'error') {
          console.error(`[Portal] Background processing error:`, data.error);
          setIsRefreshing(false);
          setProcessingStatus('');
          setAnalysisCompleted(true); // Mark as completed even on error
          return;
        }

        // Continue polling if still processing and not exceeded max attempts
        if (attempts < maxAttempts && data.status === 'processing') {
          setTimeout(() => poll(), 10000); // Poll every 10 seconds
        } else if (attempts >= maxAttempts) {
          console.log(`[Portal] Max polling attempts reached`);
          setIsRefreshing(false);
          setProcessingStatus('');
        }

      } catch (error) {
        console.error(`[Portal] Polling error:`, error);
        setIsRefreshing(false);
        setProcessingStatus('');
      }
    };

    // Start polling after a short delay
    setTimeout(() => poll(), 3000); // Wait 3 seconds before first poll
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

  // Plan data - use real entitlement data
  const planData = userEntitlement ? {
    name: `${userEntitlement.plan.charAt(0).toUpperCase() + userEntitlement.plan.slice(1)} Plan`,
    searchesUsed: userEntitlement.searches_used || 0,
    searchesTotal: userEntitlement.searches_quota || 0,
  } : user ? {
    name: 'Loading...',
    searchesUsed: 0,
    searchesTotal: 0,
  } : {
    name: 'Free Plan',
    searchesUsed: 0,
    searchesTotal: 0,
  };

  const searchesProgress = planData.searchesTotal > 0
    ? (planData.searchesUsed / planData.searchesTotal) * 100
    : 0;

  const mainMenuItems = [
    {
      id: 'analyzer',
      label: 'Handle Analyzer',
      icon: '@',
    },
    {
      id: 'favourites',
      label: 'Favourites',
      icon: '★',
    },
  ];

  const bottomMenuItems = [
    {
      id: 'share',
      label: 'Share on 𝕏 & earn',
      icon: '$',
    },
  ];

  const handleSignOut = async () => {
    try {
      console.log('[Portal] ========== SIGN OUT BUTTON CLICKED ==========');
      console.log('[Portal] Calling signOut function...');
      const result = await signOut();
      console.log('[Portal] Sign out result:', result);

      if (!result?.error) {
        console.log('[Portal] Sign out successful, navigating to Home');
        navigation.navigate('Home');
      } else {
        console.error('[Portal] Sign out failed with error:', result.error);
      }
    } catch (error) {
      console.error('[Portal] Exception in handleSignOut:', error);
    }
  };

  const handleAnalyze = () => {
    if (twitterHandle.trim()) {
      loadAnalysis(twitterHandle);
      setTwitterHandle('');
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

  const handleShowMoreTrades = () => {
    // Load next 10 trades (or remaining if less than 10)
    const newCount = Math.min(visibleTradesCount + 10, allTrades.length);
    console.log(`[Portal] Showing more trades: ${visibleTradesCount} -> ${newCount}`);
    setVisibleTradesCount(newCount);
  };

  const handleExportCSV = () => {
    console.log('[Portal] Exporting track record to CSV...');

    // Get all trades data
    const trades = allTrades && allTrades.length > 0 ? allTrades : getDummyTrades();

    // CSV header
    const headers = ['Ticker', 'Company', 'Date Posted', 'Begin Price (USD)', 'Last Price (USD)', 'Return (%)', 'Alpha vs SPY (%)', 'Tweet URL'];

    // CSV rows
    const rows = trades.map(trade => [
      trade.ticker.replace('$', ''),
      trade.company,
      formatDate(trade.dateMentioned),
      trade.beginningValue.toFixed(2),
      trade.lastValue.toFixed(2),
      trade.stockReturn.toFixed(1),
      trade.alphaVsSPY.toFixed(1),
      trade.tweetUrl
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `track_record_${twitterHandle}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('[Portal] CSV export complete');
  };

  const handleExportFavourites = () => {
    console.log('[Portal] Exporting favourites to CSV...');

    // Get favourites data
    const favs = favourites && favourites.length > 0 ? favourites : [];

    if (favs.length === 0) {
      console.log('[Portal] No favourites to export');
      return;
    }

    // CSV header
    const headers = ['Handle', 'Return (%)', 'Alpha (%)', 'Hit Ratio (%)'];

    // CSV rows
    const rows = favs.map(fav => [
      fav.handle,
      fav.avgReturn.toFixed(1),
      fav.alpha.toFixed(1),
      fav.hitRatio.toFixed(1)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `favourites_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('[Portal] Favourites CSV export complete');
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
        tweetUrl: 'https://twitter.com/chamath/status/123456789',
        tweetText: 'Just launched this free tool that lets you convert tweets and threads into beautiful images for sharing'
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
        tweetUrl: 'https://twitter.com/chamath/status/123456790',
        tweetText: 'AI chip demand is absolutely insane right now. Data center buildout accelerating faster than anyone predicted'
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
        tweetUrl: 'https://twitter.com/chamath/status/123456791',
        tweetText: 'Cloud infrastructure growth continues to be strong. AWS margins improving significantly quarter over quarter'
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
        tweetUrl: 'https://twitter.com/chamath/status/123456792',
        tweetText: 'Meta AI investments paying off big time. Reality Labs losses narrowing while Threads and Reels engagement exploding'
      }
    ];
  };

  // Get visible trades (use real data from analysis if available, otherwise dummy data)
  const getVisibleTrades = () => {
    // Use allTrades from incremental loading
    let trades = [];
    if (allTrades && allTrades.length > 0) {
      console.log('[Portal DEBUG] ✅ Using incremental data with', allTrades.length, 'total trades');
      trades = [...allTrades];
    } else if (analysisCompleted) {
      // Analysis completed but found 0 trades - show empty state
      console.log('[Portal DEBUG] ✅ Analysis completed with 0 trades');
      trades = [];
    } else {
      // No analysis has been run yet - show dummy data
      console.log('[Portal DEBUG] ⚠️ Falling back to DUMMY data (no analysis yet)');
      const dummyTrades = getDummyTrades();
      trades = [dummyTrades[0]];
    }

    // Note: Time period filtering is disabled for now to always show all available trades
    // This ensures data is always visible even if dates are old
    // In production, this would filter based on the selected time period

    console.log('[Portal DEBUG] After filtering by date:', trades.length, 'trades remain (no filtering applied)');

    // Sort by selected sort option
    if (selectedSort === 'Newest') {
      trades.sort((a, b) => new Date(b.dateMentioned) - new Date(a.dateMentioned));
    } else if (selectedSort === 'Highest Alpha') {
      trades.sort((a, b) => b.alphaVsSPY - a.alphaVsSPY);
    } else if (selectedSort === 'Highest Return') {
      trades.sort((a, b) => b.stockReturn - a.stockReturn);
    } else if (selectedSort === 'Ticker A-Z') {
      trades.sort((a, b) => a.ticker.localeCompare(b.ticker));
    } else if (selectedSort === 'Company A-Z') {
      trades.sort((a, b) => a.company.localeCompare(b.company));
    }

    // Show up to visibleTradesCount
    const result = trades.slice(0, visibleTradesCount);
    console.log('[Portal DEBUG] Returning', result.length, 'trades to display');
    return result;
  };

  // Calculate metrics based on filtered trades
  const getFilteredMetrics = () => {
    const trades = getVisibleTrades();

    if (trades.length === 0) {
      return {
        avgReturn: data?.avgReturn || 0,
        alpha: data?.alpha || 0,
        hitRatio: data?.hitRatio || 0,
      };
    }

    // Calculate average return
    const avgReturn = trades.reduce((sum, trade) => sum + trade.stockReturn, 0) / trades.length;

    // Calculate alpha based on selected benchmark
    // Note: In a real implementation, you would need benchmark return data
    // For now, we'll use the alphaVsSPY field and adjust conceptually
    let alpha;
    if (selectedBenchmark === 'S&P 500') {
      alpha = trades.reduce((sum, trade) => sum + (trade.alphaVsSPY || 0), 0) / trades.length;
    } else if (selectedBenchmark === 'NASDAQ-100') {
      // Approximate NASDAQ alpha (would need real benchmark data)
      alpha = trades.reduce((sum, trade) => sum + (trade.alphaVsSPY || 0) - 2, 0) / trades.length;
    } else if (selectedBenchmark === 'Bitcoin') {
      // Approximate Bitcoin alpha (would need real benchmark data)
      alpha = trades.reduce((sum, trade) => sum + (trade.alphaVsSPY || 0) - 5, 0) / trades.length;
    }

    // Calculate hit ratio
    const winningTrades = trades.filter(trade => trade.stockReturn > 0).length;
    const hitRatio = (winningTrades / trades.length) * 100;

    return {
      avgReturn,
      alpha: alpha || 0,
      hitRatio,
    };
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
              source={require('../assets/logos/alphahandle_logo-removebg-preview.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Main Menu */}
        <View style={styles.menuSection}>
          {mainMenuItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ hovered }) => [
                styles.menuItem,
                hovered && styles.menuItemHover,
              ]}
              onPress={() => setActiveTab(item.id)}
            >
              <View style={styles.menuIconContainer}>
                <Text style={[styles.menuIcon, activeTab === item.id && styles.menuIconActive]}>
                  {item.icon}
                </Text>
              </View>
              <Text style={[styles.menuLabel, activeTab === item.id && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bottom Section - Plan Info */}
        <View style={styles.bottomSection}>
          {/* Bottom Menu Section */}
          <View style={styles.bottomMenuSection}>
            {bottomMenuItems.map((item) => (
              <Pressable
                key={item.id}
                style={({ hovered }) => [
                  styles.menuItem,
                  hovered && styles.menuItemHover,
                ]}
                onPress={() => setActiveTab(item.id)}
              >
                <View style={styles.menuIconContainer}>
                  <Text style={[styles.menuIcon, activeTab === item.id && styles.menuIconActive]}>
                    {item.icon}
                  </Text>
                </View>
                <Text style={[styles.menuLabel, activeTab === item.id && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}

            {/* Help Button */}
            <Pressable style={styles.menuItem}>
              <View style={styles.supportIconContainer}>
                <Text style={styles.supportIcon}>?</Text>
              </View>
              <Text style={styles.supportText}>Help</Text>
            </Pressable>
          </View>

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
              onPress={() => navigation.navigate('Pricing', { fromPortal: true })}
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
          <Pressable
            style={styles.contentSection}
            onPress={() => {
              setShowDropdown(false);
              setShowSortDropdown(false);
              setShowBenchmarkDropdown(false);
            }}
          >
            {/* Search Bar - Rectangle at top with magnifying glass icon */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <MagnifyingGlassIcon size={20} color="#9aa3af" style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search account handle, e.g. @jimcramer"
                  placeholderTextColor="#9aa3af"
                  value={twitterHandle}
                  onChangeText={setTwitterHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleAnalyze}
                />
              </View>
            </View>

            {/* Page Title and Filters */}
            <View style={styles.titleSection}>
              <Text style={styles.resultsTitle}>Handle Analyzer</Text>

              {/* Filters and Export Row */}
              <View style={styles.filtersRow}>
                {/* Time Period Filter */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>Time period</Text>
                  <View style={styles.dateDropdownContainer}>
                    <Pressable
                      style={styles.filterButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowDropdown(!showDropdown);
                        setShowSortDropdown(false);
                        setShowBenchmarkDropdown(false);
                      }}
                    >
                      <Text style={styles.filterButtonText}>{selectedTimePeriod}</Text>
                      <ChevronIcon direction={showDropdown ? 'up' : 'down'} color="#425466" size={10} />
                    </Pressable>
                    {showDropdown && (
                      <Pressable
                        style={styles.dateDropdownMenu}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {['Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Last 24 Months'].map((tf) => (
                          <Pressable
                            key={tf}
                            style={[
                              styles.dropdownItem,
                              tf === selectedTimePeriod && styles.dropdownItemActive
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedTimePeriod(tf);
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              tf === selectedTimePeriod && styles.dropdownItemTextActive
                            ]}>
                              {tf}
                            </Text>
                          </Pressable>
                        ))}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Sort By Filter */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>Sort by</Text>
                  <View style={styles.dateDropdownContainer}>
                    <Pressable
                      style={styles.filterButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowSortDropdown(!showSortDropdown);
                        setShowDropdown(false);
                        setShowBenchmarkDropdown(false);
                      }}
                    >
                      <Text style={styles.filterButtonText}>{selectedSort}</Text>
                      <ChevronIcon direction={showSortDropdown ? 'up' : 'down'} color="#425466" size={10} />
                    </Pressable>
                    {showSortDropdown && (
                      <Pressable
                        style={styles.dateDropdownMenu}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {['Newest', 'Highest Alpha', 'Highest Return', 'Ticker A-Z', 'Company A-Z'].map((sort) => (
                          <Pressable
                            key={sort}
                            style={[
                              styles.dropdownItem,
                              sort === selectedSort && styles.dropdownItemActive
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedSort(sort);
                              setShowSortDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              sort === selectedSort && styles.dropdownItemTextActive
                            ]}>
                              {sort}
                            </Text>
                          </Pressable>
                        ))}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Benchmark Filter */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>Benchmark</Text>
                  <View style={styles.dateDropdownContainer}>
                    <Pressable
                      style={styles.filterButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowBenchmarkDropdown(!showBenchmarkDropdown);
                        setShowDropdown(false);
                        setShowSortDropdown(false);
                      }}
                    >
                      <Text style={styles.filterButtonText}>{selectedBenchmark}</Text>
                      <ChevronIcon direction={showBenchmarkDropdown ? 'up' : 'down'} color="#425466" size={10} />
                    </Pressable>
                    {showBenchmarkDropdown && (
                      <Pressable
                        style={styles.dateDropdownMenu}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {['S&P 500', 'NASDAQ-100', 'Bitcoin'].map((benchmark) => (
                          <Pressable
                            key={benchmark}
                            style={[
                              styles.dropdownItem,
                              benchmark === selectedBenchmark && styles.dropdownItemActive
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedBenchmark(benchmark);
                              setShowBenchmarkDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              benchmark === selectedBenchmark && styles.dropdownItemTextActive
                            ]}>
                              {benchmark}
                            </Text>
                          </Pressable>
                        ))}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Export Button */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>&nbsp;</Text>
                  <Pressable
                    style={styles.exportButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleExportCSV();
                    }}
                  >
                    <ExportIcon size={14} color="#425466" />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Loading State */}
            {analysisLoading && !data && (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="large" color="#635BFF" />
                <Text style={styles.loadingTextAnalysis}>Analyzing {twitterHandle}...</Text>
              </View>
            )}

            {/* Error State */}
            {analysisError && !data && !analysisLoading && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>⚠️ Analysis Server Error</Text>
                <Text style={styles.errorMessage}>{analysisError}</Text>
                <Text style={styles.errorHelp}>
                  To start the analysis server, run:{'\n'}
                  <Text style={styles.errorCode}>npm run dev:analysis</Text>
                </Text>
              </View>
            )}

            {/* Results Section */}
            {data && (
              <Animated.View style={{ opacity: fadeAnim }}>
                {/* Refreshing Indicator with Progress */}
                {isRefreshing && (
                  <View style={styles.refreshingIndicator}>
                    <ActivityIndicator size="small" color="#635BFF" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      {processingStatus ? (
                        <>
                          <Text style={styles.refreshingText}>{processingStatus}</Text>
                          {processingProgress > 0 && (
                            <View style={styles.progressBarBackground}>
                              <View style={[styles.progressBarFill, { width: `${processingProgress}%` }]} />
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.refreshingText}>Refreshing...</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Profile Section */}
                {profileData && (
                  <View style={styles.profileSection}>
                    <View style={styles.profileLeft}>
                      <Image
                        source={{ uri: profileData.imageUrl }}
                        style={styles.profileImage}
                      />
                      <View style={styles.profileInfo}>
                        <View style={{ gap: 4 }}>
                          {/* Photo link and name */}
                          <TouchableOpacity onPress={() => Linking.openURL(profileData.profile_url)}>
                            <Text style={[styles.profileName, { textDecorationLine: 'underline' }]}>
                              {profileData.name || profileData.username}
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.profileUsername}>@{profileData.username}</Text>
                          {!!profileData.description && (
                            <Text style={{ color: '#425466', marginTop: 2 }} numberOfLines={3}>
                              {profileData.description}
                            </Text>
                          )}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                            {!!profileData.created_at && (
                              <Text style={{ color: '#6B7C93', fontSize: 12 }}>
                                Joined {new Date(profileData.created_at).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                              </Text>
                            )}
                            <Text style={{ color: '#6B7C93', fontSize: 12 }}>
                              {profileData.friends_count?.toLocaleString()} Following
                            </Text>
                            <Text style={{ color: '#6B7C93', fontSize: 12 }}>
                              {profileData.followers_count?.toLocaleString()} Followers
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          style={styles.favouriteButton}
                          onPress={async () => {
                            try {
                              const uid = user?.id || 'anon';
                              const handleNorm = (profileData.username || twitterHandle || '').replace(/^@/, '').toLowerCase();
                              const fav = {
                                handle: handleNorm,
                                avgReturn: data?.avgReturn || 0,
                                alpha: data?.alpha || 0,
                                hitRatio: data?.hitRatio || 0,
                                addedAt: new Date().toISOString(),
                              };
                              const updated = await addFavorite(uid, fav);
                              setFavourites(updated);
                              setActiveTab('favourites');
                            } catch (e) {
                              // no-op UI for now
                            }
                          }}
                        >
                          <StarIcon size={16} color="#697386" />
                          <Text style={styles.favouriteButtonText}>Add to Favourites</Text>
                        </Pressable>
                      </View>
                    </View>
                    {/* Metrics on the right */}
                    <View style={styles.profileMetrics}>
                      {/* Return Card */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                          <TrendingUpIcon size={20} color="#9AA0A6" />
                          <Text style={styles.metricLabel}>Return</Text>
                        </View>
                        <Text style={[
                          styles.metricValue,
                          styles.largeMetric,
                          { color: getFilteredMetrics().avgReturn >= 0 ? '#1E8E3E' : '#D93025' }
                        ]}>
                          {getFilteredMetrics().avgReturn >= 0 ? '+' : ''}{getFilteredMetrics().avgReturn.toFixed(1)}%
                        </Text>
                      </View>

                      {/* Alpha Card */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                          <ChartBarIcon size={20} color="#9AA0A6" />
                          <Text style={styles.metricLabel}>Alpha</Text>
                        </View>
                        <Text style={[
                          styles.metricValue,
                          styles.largeMetric,
                          { color: getFilteredMetrics().alpha >= 0 ? '#1E8E3E' : '#D93025' }
                        ]}>
                          {getFilteredMetrics().alpha >= 0 ? '+' : ''}{getFilteredMetrics().alpha.toFixed(1)}%
                        </Text>
                      </View>

                      {/* Hit Ratio Card */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                          <TargetIcon size={20} color="#9AA0A6" />
                          <Text style={styles.metricLabel}>Hit Ratio</Text>
                        </View>
                        <Text style={[styles.metricValue, styles.largeMetric, { color: '#1A1F36' }]}>
                          {getFilteredMetrics().hitRatio.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Recent Recommendations Table */}
                <View style={styles.tableSection}>
                  <Text style={styles.tableTitle}>Track Record</Text>

                  <View style={styles.resultsTable}>
                    {/* Table Header */}
                    <View style={styles.resultsTableHeader}>
                      <Text style={[styles.tableHeaderText, styles.colTicker]}>Ticker</Text>
                      <Text style={[styles.tableHeaderText, styles.colCompany]}>Company</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Begin</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colValue]}>Last</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Return</Text>
                      <Text style={[styles.tableHeaderText, styles.numericHeader, styles.colReturn]}>Alpha</Text>
                      <Text style={[styles.tableHeaderText, styles.colPosts]}>Tweet</Text>
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
                        <View style={[styles.colTicker]}>
                          <View style={styles.tickerBadge}>
                            <Text style={[styles.tableCell, styles.tableTickerCell]}>
                              {trade.ticker.replace('$', '')}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                        <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                          <Text style={[styles.numericCell, { fontSize: 12 }]}>
                            {trade.beginningValue.toFixed(2)}
                          </Text>
                          <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                            USD
                          </Text>
                        </View>
                        <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                          <Text style={[styles.numericCell, { fontSize: 12 }]}>
                            {trade.lastValue.toFixed(2)}
                          </Text>
                          <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                            USD
                          </Text>
                        </View>
                        <View style={[styles.tableCell, styles.colReturn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                          <Text style={{ fontSize: 11, color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025' }}>
                            {trade.stockReturn >= 0 ? '↗' : '↘'}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025'
                          }}>
                            {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                          </Text>
                        </View>
                        <View style={[styles.tableCell, styles.colReturn, { alignItems: 'flex-start' }]}>
                          <View style={[
                            styles.alphaBadge,
                            trade.alphaVsSPY >= 0 ? styles.positiveAlphaBadge : styles.negativeAlphaBadge
                          ]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 11, color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }}>
                                {trade.alphaVsSPY >= 0 ? '↗' : '↘'}
                              </Text>
                              <Text style={[
                                styles.alphaBadgeText,
                                { color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }
                              ]}>
                                {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.tableCell, styles.colPosts]}
                          onPress={() => Linking.openURL(trade.tweetUrl)}
                        >
                          <View style={styles.tweetCard}>
                            <View style={styles.tweetHeader}>
                              <Text style={styles.xIcon}>𝕏</Text>
                              <Text style={styles.tweetHandle}>@{twitterHandle}</Text>
                            </View>
                            <Text style={styles.tweetText} numberOfLines={2}>
                              {trade.tweetText || 'Tweet text unavailable'}
                            </Text>
                            <Text style={styles.tweetDate}>
                              {formatDate(trade.dateMentioned)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Show More Button (only if subscribed and more trades available) */}
                    {!isRefreshing && allTrades.length > visibleTradesCount && (
                      <View style={styles.showMoreTradesButtonContainer}>
                        <Pressable
                          style={styles.showMoreTradesButton}
                          onPress={handleShowMoreTrades}
                        >
                          <Text style={styles.showMoreTradesButtonText}>
                            Show More ({allTrades.length - visibleTradesCount} remaining)
                          </Text>
                          <Text style={{ fontSize: 16, color: '#635BFF' }}>↓</Text>
                        </Pressable>
                      </View>
                    )}

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
                            <View style={[styles.colTicker]}>
                              <View style={styles.tickerBadge}>
                                <Text style={[styles.tableCell, styles.tableTickerCell]}>
                                  {trade.ticker.replace('$', '')}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                            <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                              <Text style={[styles.numericCell, { fontSize: 12 }]}>
                                {trade.beginningValue.toFixed(2)}
                              </Text>
                              <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                                USD
                              </Text>
                            </View>
                            <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                              <Text style={[styles.numericCell, { fontSize: 12 }]}>
                                {trade.lastValue.toFixed(2)}
                              </Text>
                              <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                                USD
                              </Text>
                            </View>
                            <View style={[styles.tableCell, styles.colReturn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <Text style={{ fontSize: 11, color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025' }}>
                                {trade.stockReturn >= 0 ? '↗' : '↘'}
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025'
                              }}>
                                {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                              </Text>
                            </View>
                            <View style={[styles.tableCell, styles.colReturn, { alignItems: 'flex-start' }]}>
                              <View style={[
                                styles.alphaBadge,
                                trade.alphaVsSPY >= 0 ? styles.positiveAlphaBadge : styles.negativeAlphaBadge
                              ]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={{ fontSize: 11, color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }}>
                                    {trade.alphaVsSPY >= 0 ? '↗' : '↘'}
                                  </Text>
                                  <Text style={[
                                    styles.alphaBadgeText,
                                    { color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }
                                  ]}>
                                    {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={[styles.tableCell, styles.colPosts]}
                              onPress={() => Linking.openURL(trade.tweetUrl)}
                            >
                              <View style={styles.tweetCard}>
                                <View style={styles.tweetHeader}>
                                  <Text style={styles.xIcon}>𝕏</Text>
                                  <Text style={styles.tweetHandle}>@{twitterHandle}</Text>
                                </View>
                                <Text style={styles.tweetText} numberOfLines={2}>
                                  {trade.tweetText || 'Just launched this free tool that lets you convert tweets and threads int...'}
                                </Text>
                                <Text style={styles.tweetDate}>
                                  {formatDate(trade.dateMentioned)}
                                </Text>
                              </View>
                            </TouchableOpacity>
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
                              <View style={[styles.colTicker]}>
                                <View style={styles.tickerBadge}>
                                  <Text style={[styles.tableCell, styles.tableTickerCell]}>
                                    {trade.ticker.replace('$', '')}
                                  </Text>
                                </View>
                              </View>
                              <Text style={[styles.tableCell, styles.colCompany]} numberOfLines={1}>{trade.company}</Text>
                              <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                                <Text style={[styles.numericCell, { fontSize: 12 }]}>
                                  {trade.beginningValue.toFixed(2)}
                                </Text>
                                <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                                  USD
                                </Text>
                              </View>
                              <View style={[styles.tableCell, styles.colValue, { flexDirection: 'row', alignItems: 'baseline', gap: 3 }]}>
                                <Text style={[styles.numericCell, { fontSize: 12 }]}>
                                  {trade.lastValue.toFixed(2)}
                                </Text>
                                <Text style={[styles.numericCell, { fontSize: 8, opacity: 0.6 }]}>
                                  USD
                                </Text>
                              </View>
                              <View style={[styles.tableCell, styles.colReturn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <Text style={{ fontSize: 12, color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025' }}>
                                  {trade.stockReturn >= 0 ? '↗' : '↘'}
                                </Text>
                                <Text style={[
                                  styles.numericCell,
                                  { color: trade.stockReturn >= 0 ? '#1E8E3E' : '#D93025' }
                                ]}>
                                  {trade.stockReturn >= 0 ? '+' : ''}{trade.stockReturn.toFixed(1)}%
                                </Text>
                              </View>
                              <View style={[styles.tableCell, styles.colReturn, { alignItems: 'flex-start' }]}>
                                <View style={[
                                  styles.alphaBadge,
                                  trade.alphaVsSPY >= 0 ? styles.positiveAlphaBadge : styles.negativeAlphaBadge
                                ]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{ fontSize: 11, color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }}>
                                      {trade.alphaVsSPY >= 0 ? '↗' : '↘'}
                                    </Text>
                                    <Text style={[
                                      styles.alphaBadgeText,
                                      { color: trade.alphaVsSPY >= 0 ? '#1E8E3E' : '#D93025' }
                                    ]}>
                                      {trade.alphaVsSPY >= 0 ? '+' : ''}{trade.alphaVsSPY.toFixed(1)}%
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={[styles.tableCell, styles.colPosts]}
                                onPress={() => Linking.openURL(trade.tweetUrl)}
                              >
                                <View style={styles.tweetCard}>
                                  <View style={styles.tweetHeader}>
                                    <Text style={styles.xIcon}>𝕏</Text>
                                    <Text style={styles.tweetHandle}>@{twitterHandle}</Text>
                                  </View>
                                  <Text style={styles.tweetText} numberOfLines={2}>
                                    {trade.tweetText || 'Just launched this free tool that lets you convert tweets and threads int...'}
                                  </Text>
                                  <Text style={styles.tweetDate}>
                                    {formatDate(trade.dateMentioned)}
                                  </Text>
                                </View>
                              </TouchableOpacity>
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

            {/* Empty State */}
            {!data && !analysisLoading && (
              <View style={styles.emptyState}>
                <View style={{ marginBottom: 8 }}>
                  <EmptyStateIcon width={280} height={200} />
                </View>
                <Text style={styles.emptyStateTitle}>Transparency is at your fingertips</Text>
                <Text style={styles.emptyStateSubtitle}>Start by searching a handle</Text>
              </View>
            )}
          </Pressable>
        )}

        {activeTab === 'favourites' && (
          <Pressable
            style={styles.contentSection}
            onPress={() => {
              setShowDropdown(false);
              setShowSortDropdown(false);
              setShowBenchmarkDropdown(false);
            }}
          >
            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <MagnifyingGlassIcon size={20} color="#9aa3af" style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search account handle, e.g. @jimcramer"
                  placeholderTextColor="#9aa3af"
                  value={twitterHandle}
                  onChangeText={setTwitterHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleAnalyze}
                />
              </View>
            </View>

            {/* Page Title and Filters */}
            <View style={styles.titleSection}>
              <Text style={styles.resultsTitle}>Favourites</Text>

              {/* Filters Row */}
              <View style={styles.filtersRow}>
                {/* Time Period Filter */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>Time period</Text>
                  <View style={styles.dateDropdownContainer}>
                    <Pressable
                      style={styles.filterButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowDropdown(!showDropdown);
                        setShowSortDropdown(false);
                        setShowBenchmarkDropdown(false);
                      }}
                    >
                      <Text style={styles.filterButtonText}>{selectedTimePeriod}</Text>
                      <ChevronIcon direction={showDropdown ? 'up' : 'down'} color="#425466" size={10} />
                    </Pressable>
                    {showDropdown && (
                      <Pressable
                        style={styles.dateDropdownMenu}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {['Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Last 24 Months'].map((tf) => (
                          <Pressable
                            key={tf}
                            style={[
                              styles.dropdownItem,
                              tf === selectedTimePeriod && styles.dropdownItemActive
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedTimePeriod(tf);
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              tf === selectedTimePeriod && styles.dropdownItemTextActive
                            ]}>
                              {tf}
                            </Text>
                          </Pressable>
                        ))}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Benchmark Filter */}
                <View style={styles.filterContainer}>
                  <Text style={styles.filterLabel}>Benchmark</Text>
                  <View style={styles.dateDropdownContainer}>
                    <Pressable
                      style={styles.filterButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowBenchmarkDropdown(!showBenchmarkDropdown);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.filterButtonText}>{selectedBenchmark}</Text>
                      <ChevronIcon direction={showBenchmarkDropdown ? 'up' : 'down'} color="#425466" size={10} />
                    </Pressable>
                    {showBenchmarkDropdown && (
                      <Pressable
                        style={styles.dateDropdownMenu}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {['S&P 500', 'NASDAQ-100', 'Bitcoin'].map((benchmark) => (
                          <Pressable
                            key={benchmark}
                            style={[
                              styles.dropdownItem,
                              benchmark === selectedBenchmark && styles.dropdownItemActive
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedBenchmark(benchmark);
                              setShowBenchmarkDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              benchmark === selectedBenchmark && styles.dropdownItemTextActive
                            ]}>
                              {benchmark}
                            </Text>
                          </Pressable>
                        ))}
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {(!favourites || favourites.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>★</Text>
                <Text style={styles.emptyStateText}>No favourites yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Star accounts to save them here for quick access
                </Text>
              </View>
            ) : (
              <View style={styles.resultsTable}>
                {/* Header with sortable columns */}
                <View style={styles.resultsTableHeader}>
                  {[
                    { key: 'handle', label: 'Handle' },
                    { key: 'avgReturn', label: 'Return' },
                    { key: 'alpha', label: 'Alpha' },
                    { key: 'hitRatio', label: 'Hit Ratio' },
                  ].map((col) => (
                    <Pressable
                      key={col.key}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => {
                        if (favSortKey === col.key) {
                          setFavSortDir(favSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setFavSortKey(col.key);
                          setFavSortDir('asc');
                        }
                      }}
                    >
                      <Text style={styles.tableHeaderText}>{col.label}</Text>
                      <Text style={{ fontSize: 10, marginLeft: 4, color: '#6B7C93' }}>
                        {favSortKey === col.key ? (favSortDir === 'asc' ? '↑' : '↓') : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {favourites
                  .slice()
                  .sort((a, b) => {
                    const dir = favSortDir === 'asc' ? 1 : -1;
                    if (favSortKey === 'handle') {
                      return a.handle.localeCompare(b.handle) * dir;
                    }
                    return ((a[favSortKey] || 0) - (b[favSortKey] || 0)) * dir;
                  })
                  .map((fav, idx) => (
                    <View
                      key={`${fav.handle}-${idx}`}
                      style={[styles.resultsTableRow, idx % 2 === 1 && styles.tableRowZebra]}
                    >
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', color: '#635BFF' }]}>@{fav.handle}</Text>
                      <Text style={[styles.tableCell, { flex: 1, color: (fav.avgReturn || 0) >= 0 ? '#1E8E3E' : '#D93025' }]}>
                        {(fav.avgReturn || 0) >= 0 ? '+' : ''}{(fav.avgReturn || 0).toFixed(1)}%
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1, color: (fav.alpha || 0) >= 0 ? '#1E8E3E' : '#D93025' }]}>
                        {(fav.alpha || 0) >= 0 ? '+' : ''}{(fav.alpha || 0).toFixed(1)}%
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>
                        {(fav.hitRatio || 0).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </Pressable>
        )}

        {activeTab === 'share' && (
          <View style={styles.contentSection}>
            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <MagnifyingGlassIcon size={20} color="#9aa3af" style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search account handle, e.g. @jimcramer"
                  placeholderTextColor="#9aa3af"
                  value={twitterHandle}
                  onChangeText={setTwitterHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleAnalyze}
                />
              </View>
            </View>

            {/* Page Title */}
            <View style={styles.titleSection}>
              <Text style={styles.resultsTitle}>Share on X & earn</Text>
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
    marginBottom: 12,
    paddingBottom: 0,
    paddingTop: 0,
    marginTop: -8,
  },
  logoContainer: {
    paddingVertical: 0,
  },
  logoImage: {
    height: 56,
    width: 208,
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
    paddingLeft: 16,
    paddingRight: 12,
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
  bottomMenuSection: {
    gap: 2,
    marginBottom: 0,
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
    letterSpacing: -0.32,
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
    letterSpacing: -0.32,
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: '100vh',
    overflow: 'auto',
  },
  mainContentContainer: {
    paddingTop: 12,
    paddingRight: 32,
    paddingBottom: 32,
    paddingLeft: 32,
  },
  contentSection: {
    flex: 1,
  },

  // Search Section - Rectangle at top with search icon
  searchSection: {
    marginBottom: 32,
    marginTop: 8,
    zIndex: 10000,
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 0,
    alignItems: 'center',
    height: 38,
    maxWidth: 600,
    paddingLeft: 4,
    paddingRight: 4,
    zIndex: 10000,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#5F6368',
    height: 38,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    letterSpacing: -0.4,
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
    letterSpacing: -0.45,
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
    letterSpacing: -0.3,
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
    letterSpacing: -0.35,
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
    letterSpacing: -0.35,
  },
  metricValue: {
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  positiveValue: {
    fontWeight: '600',
    color: '#00D924',
    letterSpacing: -0.35,
  },
  dateText: {
    color: '#8A94A6',
    letterSpacing: -0.35,
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
    letterSpacing: -0.45,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8A94A6',
    textAlign: 'center',
    maxWidth: 400,
    letterSpacing: -0.35,
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
    letterSpacing: -0.4,
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
    letterSpacing: -0.35,
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
    letterSpacing: -0.35,
  },
  referralNote: {
    fontSize: 13,
    color: '#8A94A6',
    lineHeight: 20,
    letterSpacing: -0.32,
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
    letterSpacing: -0.4,
  },
  errorSection: {
    paddingVertical: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
    marginTop: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 12,
    letterSpacing: -0.45,
  },
  errorMessage: {
    fontSize: 14,
    color: '#742A2A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    letterSpacing: -0.35,
  },
  errorHelp: {
    fontSize: 13,
    color: '#6B7C93',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  errorCode: {
    fontFamily: 'monospace',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#2D3748',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 120,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7C93',
    textAlign: 'center',
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
    letterSpacing: -0.32,
  },
  titleSection: {
    marginBottom: 32,
    zIndex: 10000,
    position: 'relative',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  filterContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1F36',
    letterSpacing: -0.3,
  },
  dateDropdownContainer: {
    position: 'relative',
    zIndex: 10001,
    alignSelf: 'flex-start',
  },
  dateDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  dateDropdownButtonText: {
    fontSize: 14,
    color: '#425466',
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    minWidth: 160,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#425466',
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  dateDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 999,
    zIndex: 99999,
  },
  handleTextResults: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635BFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#6B7C93',
    letterSpacing: -0.32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 20,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 0,
    letterSpacing: -0.35,
  },
  largeMetric: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: '700',
  },
  metricChange: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
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
  tableTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    zIndex: 1001,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  tableControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1001,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    color: '#425466',
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  tableFilterDropdown: {
    position: 'relative',
    zIndex: 1000,
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterDropdownButtonText: {
    fontSize: 14,
    color: '#425466',
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  filterDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 1000,
    minWidth: 160,
  },
  resultsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    overflow: 'hidden',
    zIndex: 1,
  },
  resultsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7C93',
    textTransform: 'uppercase',
    letterSpacing: -0.25,
    paddingHorizontal: 6,
    textAlign: 'left',
  },
  numericHeader: {
    textAlign: 'left',
  },
  resultsTableRow: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tableRowZebra: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    fontSize: 12,
    color: '#1A1F36',
    paddingHorizontal: 6,
    fontFamily: 'SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    textAlign: 'left',
    letterSpacing: -0.3,
  },
  numericCell: {
    textAlign: 'left',
  },
  tickerBadge: {
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  tableTickerCell: {
    fontWeight: '700',
    color: '#1A1F36',
    letterSpacing: -0.3,
    paddingHorizontal: 0,
  },
  positiveReturn: {
    color: '#00D924',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  negativeReturn: {
    color: '#FF6B6B',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  positiveAlpha: {
    color: '#00D924',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  negativeAlpha: {
    color: '#FF6B6B',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  hitText: {
    color: '#00D924',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  missText: {
    color: '#FF6B6B',
    fontWeight: '600',
    letterSpacing: -0.3,
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
    letterSpacing: -0.4,
  },
  seeMoreHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#4F566B',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.32,
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
    letterSpacing: -0.3,
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
    fontSize: 12,
    color: '#5F6368',
    letterSpacing: -0.4,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#5F6368',
    letterSpacing: -0.4,
  },

  // Table Column Widths - adjusted for dynamic content
  colTicker: {
    flex: 0.6,
  },
  colCompany: {
    flex: 1.5,
  },
  colDate: {
    flex: 1.1,
  },
  colValue: {
    flex: 0.8,
  },
  colDividend: {
    flex: 0.7,
  },
  colReturn: {
    flex: 0.9,
  },
  colChart: {
    flex: 1.2,
  },
  colTweet: {
    flex: 0.5,
  },
  colPosts: {
    flex: 2.0,
    paddingHorizontal: 4,
  },

  // Tweet/Post Styles
  tweetCard: {
    width: '100%',
    paddingVertical: 2,
  },
  tweetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  xIcon: {
    fontSize: 12,
    color: '#000000',
  },
  tweetHandle: {
    fontSize: 12,
    color: '#536471',
    fontWeight: '500',
  },
  tweetText: {
    fontSize: 13,
    color: '#0F1419',
    lineHeight: 18,
    marginBottom: 4,
  },
  tweetDate: {
    fontSize: 10,
    color: '#6B7C93',
    opacity: 0.8,
  },

  // Alpha Badge Styles
  alphaBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positiveAlphaBadge: {
    backgroundColor: '#E6F4EA',  // Light mint green background
  },
  negativeAlphaBadge: {
    backgroundColor: '#FCE8E8',  // Light red background
  },
  alphaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
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
    letterSpacing: -0.4,
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    flex: 1,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  profileMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 20,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F36',
    letterSpacing: -0.45,
  },
  verifiedBadge: {
    fontSize: 16,
    color: '#1DA1F2',
  },
  profileUsername: {
    fontSize: 14,
    color: '#6B7C93',
    letterSpacing: -0.35,
  },
  favouriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    alignSelf: 'flex-start',
  },
  favouriteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#425466',
    letterSpacing: -0.35,
  },

  // Show More Trades Button Styles
  showMoreTradesButtonContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FAFBFC',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EF',
    alignItems: 'center',
  },
  showMoreTradesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#635BFF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  showMoreTradesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#635BFF',
    letterSpacing: -0.35,
  },
});
