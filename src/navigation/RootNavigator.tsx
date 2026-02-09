import React, { useRef } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  LinkingOptions,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';

import { RootStackParamList, MainTabParamList } from '../types';
import { colors } from '../lib/theme';
import { useCanopy } from '../contexts/CanopyContext';
import { routingInstrumentation } from '../lib/sentry';

// Deep link configuration
const prefix = Linking.createURL('/');
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'com.canopy.mobile://'],
  config: {
    screens: {
      Landing: 'landing',
      Terms: 'terms',
      MainTabs: {
        screens: {
          Dashboard: 'dashboard',
          Opportunities: 'opportunities',
          Investments: 'investments',
          Settings: 'settings',
        },
      },
      OpportunityDetails: 'opportunity/:id',
      Invest: 'invest/:plotId',
    },
  },
};

// Screens
import LandingScreen from '../screens/LandingScreen';
import TermsScreen from '../screens/TermsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OpportunitiesScreen from '../screens/OpportunitiesScreen';
import OpportunityDetailsScreen from '../screens/OpportunityDetailsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InvestScreen from '../screens/InvestScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom dark theme
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Opportunities':
              iconName = focused ? 'leaf' : 'leaf-outline';
              break;
            case 'Investments':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen
        name="Opportunities"
        component={OpportunitiesScreen}
        options={{ title: 'Opportunities' }}
      />
      <Tab.Screen
        name="Investments"
        component={InvestmentsScreen}
        options={{ title: 'My Investments' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isAuthLoading } = useCanopy();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Show loading screen while checking auth state
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={DarkTheme}
      linking={linking}
      onReady={() => {
        // Register navigation container with Sentry for screen tracking
        routingInstrumentation.registerNavigationContainer(navigationRef);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="OpportunityDetails"
              component={OpportunityDetailsScreen}
              options={{ title: 'Opportunity' }}
            />
            <Stack.Screen
              name="Invest"
              component={InvestScreen}
              options={({ route }) => ({
                title: `Invest in ${route.params.title}`,
                presentation: 'modal',
              })}
            />
          </>
        )}
        <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms of Use' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
