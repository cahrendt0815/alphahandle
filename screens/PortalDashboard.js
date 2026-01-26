/**
 * PortalDashboard - Modern dark-themed dashboard
 * Inspired by the Aniq UI dashboard design
 * Uses Tailwind CSS styling patterns and Framer Motion for animations
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Image, 
  Platform, 
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import AlphaLogo from '../components/AlphaLogo';

// Conditional Framer Motion import for web
let motion;
if (Platform.OS === 'web') {
  try {
    motion = require('framer-motion');
  } catch (e) {
    console.warn('Framer Motion not installed. Run: npm install framer-motion');
  }
}

// Animation wrapper component
const AnimatedCard = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Framer Motion support (disabled if not installed)
  // if (Platform.OS === 'web' && motion && motion.div) {
  //   const MotionView = motion.div;
  //   return (
  //     <MotionView
  //       initial={{ opacity: 0, y: 20 }}
  //       animate={{ opacity: 1, y: 0 }}
  //       transition={{ duration: 0.6, delay: delay }}
  //       style={style}
  //     >
  //       {children}
  //     </MotionView>
  //   );
  // }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default function PortalDashboard({ navigation, route }) {
  const { user, signOut } = useAuth();
  const [activeNav, setActiveNav] = useState('overview');
  const [darkMode, setDarkMode] = useState(true);
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;
  
  // Handle route params (e.g., handle from navigation)
  const routeHandle = route?.params?.handle;
  
  // If a handle is provided, you could navigate to analyzer or show a message
  useEffect(() => {
    if (routeHandle) {
      console.log('[PortalDashboard] Handle provided:', routeHandle);
      // Optionally: navigate to analyzer or show handle-specific content
      // For now, we'll just log it
    }
  }, [routeHandle]);

  // Navigation items with proper icons
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'cards', label: 'Your Cards', icon: '💳' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '↔️' },
    { id: 'components', label: 'UI Components', icon: '⚙️' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
  ];

  // Dashboard metrics
  const metrics = [
    { label: 'Total Revenue', value: '$284,382', change: '+12.5%', positive: true, icon: '💰' },
    { label: 'Total Expenses', value: '$142,847', change: '-8.2%', positive: true, icon: '💸' },
    { label: 'Net Profit', value: '$141,535', change: '+23.1%', positive: true, icon: '📈' },
    { label: 'Savings Rate', value: '49.7%', change: '+5.3%', positive: true, icon: '💎' },
  ];

  // Transactions data
  const transactions = [
    { from: 'From Pierre DC', amount: '-$1,024.00', type: 'Bank transfer', date: 'Today', category: 'Transfer' },
    { from: 'From Alessandro VN', amount: '+$954.00', type: 'Bank transfer', date: 'Today', category: 'Transfer' },
    { from: 'Netflix Subscription', amount: '-$15.99', type: 'Entertainment', date: '19/09/2024', category: 'Entertainment' },
    { from: 'Salary Payment', amount: '+$5,200.00', type: 'Income', date: '19/09/2024', category: 'Income' },
  ];

  const userName = user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Left Sidebar */}
      <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
        {/* Logo */}
        <AnimatedCard delay={0} style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/logos/alphahandle_logo-removebg-preview.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </AnimatedCard>

        {/* Navigation Items */}
        <View style={styles.navSection}>
          {navItems.map((item, index) => (
            <AnimatedCard key={item.id} delay={0.1 + index * 0.05}>
              <Pressable
                onPress={() => setActiveNav(item.id)}
                style={({ pressed }) => [
                  styles.navItem,
                  activeNav === item.id && styles.navItemActive,
                  pressed && styles.navItemPressed,
                ]}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[
                  styles.navLabel,
                  activeNav === item.id && styles.navLabelActive,
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            </AnimatedCard>
          ))}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          {/* Left side - Logo and Title */}
          <View style={styles.headerLeft}>
            <View style={styles.headerLogo}>
              <Text style={styles.headerLogoText}>A</Text>
            </View>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>

          {/* Right side - Actions */}
          <View style={styles.headerRight}>
            <Pressable style={styles.headerButton}>
              <Text style={styles.headerButtonText}>US 🇺🇸</Text>
            </Pressable>
            <Pressable 
              onPress={() => setDarkMode(!darkMode)} 
              style={styles.headerButton}
            >
              <Text style={styles.headerIcon}>🌙</Text>
            </Pressable>
            <Pressable style={styles.headerButton}>
              <Text style={styles.headerIcon}>🔍</Text>
            </Pressable>
            <Pressable style={styles.headerButton}>
              <Text style={styles.headerIcon}>🔄</Text>
            </Pressable>
            <Pressable style={[styles.headerButton, styles.notificationButton]}>
              <Text style={styles.headerIcon}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>2</Text>
              </View>
            </Pressable>
            <View style={styles.userProfile}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{userInitial}</Text>
              </View>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <AnimatedCard delay={0.2}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                Good evening, {userName}! 👋
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Welcome back to your financial dashboard
              </Text>
            </View>
          </AnimatedCard>

          {/* Metrics Cards */}
          <View style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <AnimatedCard key={index} delay={0.3 + index * 0.1}>
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricIcon}>{metric.icon}</Text>
                    <Pressable style={styles.metricMenu}>
                      <Text style={styles.metricMenuText}>⋯</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <View style={styles.metricChange}>
                    <Text style={[
                      styles.metricChangeText,
                      metric.positive ? styles.metricChangePositive : styles.metricChangeNegative,
                    ]}>
                      {metric.change}
                    </Text>
                    <Text style={styles.metricChangeLabel}>vs last month</Text>
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </View>

          {/* Charts Section */}
          <View style={styles.chartsSection}>
            {/* Revenue vs Expenses Chart */}
            <AnimatedCard delay={0.7} style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Revenue vs Expenses</Text>
                <View style={styles.chartTabs}>
                  {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((period) => (
                    <Pressable
                      key={period}
                      style={[
                        styles.chartTab,
                        period === 'Monthly' && styles.chartTabActive,
                      ]}
                    >
                      <Text style={[
                        styles.chartTabText,
                        period === 'Monthly' && styles.chartTabTextActive,
                      ]}>
                        {period}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>📊 Chart visualization</Text>
              </View>
            </AnimatedCard>

            {/* Spending by Category */}
            <AnimatedCard delay={0.8} style={styles.categoryCard}>
              <Text style={styles.chartTitle}>Spending by Category</Text>
              <View style={styles.donutChartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>🍩 Donut chart</Text>
              </View>
              <View style={styles.categoryList}>
                {[
                  { label: 'Shopping', value: '35%', color: '#FF6B35' },
                  { label: 'Transport', value: '25%', color: '#3B82F6' },
                  { label: 'Food', value: '20%', color: '#10B981' },
                  { label: 'Entertainment', value: '15%', color: '#8B5CF6' },
                  { label: 'Others', value: '5%', color: '#6B7280' },
                ].map((item, index) => (
                  <View key={index} style={styles.categoryItem}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                    <Text style={styles.categoryLabel}>{item.label}</Text>
                    <Text style={styles.categoryValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </AnimatedCard>
          </View>

          {/* Transactions Table */}
          <AnimatedCard delay={0.9} style={styles.transactionsCard}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.chartTitle}>Recent Transactions</Text>
              <Pressable>
                <Text style={styles.showMoreText}>Show more</Text>
              </Pressable>
            </View>
            <View style={styles.transactionsList}>
              {transactions.map((transaction, index) => (
                <View
                  key={index}
                  style={[
                    styles.transactionItem,
                    index < transactions.length - 1 && styles.transactionItemBorder,
                  ]}
                >
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionFrom}>{transaction.from}</Text>
                    <Text style={styles.transactionType}>{transaction.type}</Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.amount.startsWith('+') 
                        ? styles.transactionAmountPositive 
                        : styles.transactionAmountNegative,
                    ]}>
                      {transaction.amount}
                    </Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </AnimatedCard>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1A1D29',
    ...(Platform.OS === 'web' && { height: '100vh' }),
  },
  sidebar: {
    width: 240,
    backgroundColor: '#252836',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#3A3F54',
    ...(Platform.OS === 'web' && { height: '100vh' }),
  },
  sidebarMobile: {
    width: 200,
  },
  logoContainer: {
    marginBottom: 24,
    paddingTop: 8,
  },
  logoWrapper: {
    height: 56,
    width: 208,
  },
  logoImage: {
    height: 56,
    width: 208,
  },
  navSection: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  navItemActive: {
    backgroundColor: '#FF6B35',
  },
  navItemPressed: {
    opacity: 0.8,
  },
  navIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 20,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B8F9E',
  },
  navLabelActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    height: 64,
    backgroundColor: '#252836',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3F54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerLogo: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    }),
  },
  headerButtonText: {
    color: '#8B8F9E',
    fontSize: 14,
  },
  headerIcon: {
    fontSize: 18,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A3F54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1A1D29',
  },
  scrollContent: {
    padding: 24,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#8B8F9E',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#252836',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3F54',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 24,
  },
  metricMenu: {
    padding: 4,
  },
  metricMenuText: {
    color: '#8B8F9E',
    fontSize: 18,
  },
  metricLabel: {
    fontSize: 14,
    color: '#8B8F9E',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricChangePositive: {
    color: '#4ADE80',
  },
  metricChangeNegative: {
    color: '#F87171',
  },
  metricChangeLabel: {
    fontSize: 12,
    color: '#8B8F9E',
    marginLeft: 4,
  },
  chartsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    flex: 2,
    backgroundColor: '#252836',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3F54',
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#252836',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3F54',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chartTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  chartTabActive: {
    backgroundColor: '#FF6B35',
  },
  chartTabText: {
    fontSize: 12,
    color: '#8B8F9E',
    fontWeight: '400',
  },
  chartTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#1A1D29',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutChartPlaceholder: {
    height: 200,
    backgroundColor: '#1A1D29',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartPlaceholderText: {
    color: '#8B8F9E',
    fontSize: 14,
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 14,
    color: '#8B8F9E',
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionsCard: {
    backgroundColor: '#252836',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3F54',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  showMoreText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#3A3F54',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionFrom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 12,
    color: '#8B8F9E',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionAmountPositive: {
    color: '#4ADE80',
  },
  transactionAmountNegative: {
    color: '#F87171',
  },
  transactionDate: {
    fontSize: 12,
    color: '#8B8F9E',
    marginTop: 4,
  },
});
