import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { WalletProvider } from './contexts/WalletContext';
import { CanopyProvider } from './contexts/CanopyContext';
import RootNavigator from './navigation/RootNavigator';
import { colors, fontFamily, fontSize, spacing, borderRadius } from './lib/theme';
import { initSentry, SentryErrorBoundary, setSentryNetwork } from './lib/sentry';

// Initialize Sentry as early as possible
initSentry();

// Fallback component for error boundary
function ErrorFallback({
  error,
  resetError,
}: {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{errorMessage}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={resetError}>
        <Text style={errorStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
});

export default function App() {
  return (
    <SentryErrorBoundary fallback={ErrorFallback}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.background} />
        <NetworkProvider>
          <AppWithNetwork />
        </NetworkProvider>
      </SafeAreaProvider>
    </SentryErrorBoundary>
  );
}

// Inner component that uses network context
function AppWithNetwork() {
  const { network, networkConfig } = useNetwork();

  // Set Sentry network context when network changes
  useEffect(() => {
    setSentryNetwork(network, networkConfig.apiUrl);
  }, [network, networkConfig.apiUrl]);

  return (
    <WalletProvider rpcUrl={networkConfig.rpcUrl}>
      <CanopyProvider>
        <RootNavigator />
      </CanopyProvider>
    </WalletProvider>
  );
}
