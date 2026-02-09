import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useWallet } from '../../contexts/WalletContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../lib/theme';

interface WalletButtonProps {
  onPress?: () => void;
  showAddress?: boolean;
}

export function WalletButton({ onPress, showAddress = true }: WalletButtonProps) {
  const { connected, connecting, walletAddress, connect, disconnect } = useWallet();

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    if (connected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  if (connecting) {
    return (
      <View style={styles.button}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.buttonText}>Connecting...</Text>
      </View>
    );
  }

  if (connected && showAddress) {
    return (
      <TouchableOpacity style={styles.connectedButton} onPress={handlePress}>
        <View style={styles.connectedContent}>
          <View style={styles.statusDot} />
          <Text style={styles.addressText} numberOfLines={1}>
            {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="wallet-outline" size={20} color={colors.primary} />
      <Text style={styles.buttonText}>{connected ? 'Disconnect' : 'Connect Wallet'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  connectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  connectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  addressText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
