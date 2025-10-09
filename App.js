import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { setMarketBaseUrl } from './lib/marketClient';
import { MARKET_BASE_URL } from './lib/appEnv';
import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import PlanSelectionScreen from './screens/PlanSelectionScreen';
import PricingScreen from './screens/PricingScreen';
import PaySuccessScreen from './screens/PaySuccessScreen';
import PayCancelScreen from './screens/PayCancelScreen';
import AuthLoadingScreen from './screens/AuthLoadingScreen';
import AuthResetScreen from './screens/AuthResetScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import AccountScreen from './screens/AccountScreen';
import PortalScreen from './screens/PortalScreen';

const Stack = createStackNavigator();

// Initialize market API base URL
setMarketBaseUrl(MARKET_BASE_URL);
console.log("Using market API at", MARKET_BASE_URL);

function AppNavigator() {
  const { isHandlingRedirect, loading } = useAuth();

  // Show loading screen while auth is initializing or handling redirect
  // But keep Navigator mounted so linking can work
  return (
    <>
      {isHandlingRedirect && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: '#FFFFFF'
        }}>
          <AuthLoadingScreen />
        </View>
      )}
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
            },
          }),
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Portal" component={PortalScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />
        <Stack.Screen name="Plans" component={PlanSelectionScreen} />
        <Stack.Screen name="PaySuccess" component={PaySuccessScreen} />
        <Stack.Screen name="PayCancel" component={PayCancelScreen} />
        <Stack.Screen name="AuthReset" component={AuthResetScreen} />
      </Stack.Navigator>
    </>
  );
}

// Linking configuration for web URLs
const linking = {
  prefixes: ['http://localhost:8083', 'https://localhost:8083'],
  config: {
    screens: {
      Home: '',
      Portal: 'portal',
      SignIn: 'signin',
      SignUp: 'signup',
      Results: 'results',
      Pricing: 'pricing',
      Plans: 'plans',
      PaySuccess: 'pay/success',
      PayCancel: 'pay/cancel',
      AuthReset: 'auth/reset',
    },
  },
};

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.overflowY = 'auto';
    }
  }, []);

  return (
    <AuthProvider navigationRef={navigationRef}>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
