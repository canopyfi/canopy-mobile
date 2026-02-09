import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useCanopy } from '../contexts/CanopyContext';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../lib/theme';
import MatricaLogo from '../components/MatricaLogo';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../assets/icon.png');

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, isAuthLoading } = useCanopy();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
      Alert.alert('Login Failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        {/* Logo and Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logoImage} />
          </View>
          <Text style={styles.title}>Canopy</Text>
          <Text style={styles.subtitle}>Welcome to Canopy!</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="shield-checkmark-outline"
            title="Secure Investment"
            description="Your investments are protected by Solana blockchain"
          />
          <FeatureItem
            icon="trending-up-outline"
            title="Growth Opportunities"
            description="Access exclusive investment opportunities"
          />
          <FeatureItem
            icon="wallet-outline"
            title="Easy Management"
            description="Track and manage your portfolio in one place"
          />
        </View>

        {/* Login Button */}
        <View style={styles.connectSection}>
          <TouchableOpacity
            style={[styles.connectButton, isAuthLoading && styles.connectButtonDisabled]}
            onPress={handleLogin}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <>
                <MatricaLogo size={20} color={colors.background} />
                <Text style={styles.connectButtonText}>Connect using MATRICA</Text>
              </>
            )}
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By connecting, you agree to our{' '}
          <Text style={styles.footerLink} onPress={() => navigation.navigate('Terms')}>
            Terms of Use
          </Text>
        </Text>
        <Text style={styles.footerText}>Tended by Canopy Collective LTD.</Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  title: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  connectSection: {
    alignItems: 'center',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    gap: spacing.sm,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
