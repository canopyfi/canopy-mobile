import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../ui/Button';
import { colors, spacing, fontSize, fontWeight } from '../../lib/theme';

interface EmptyInvestmentsStateProps {
  onExplorePress?: () => void;
}

export function EmptyInvestmentsState({ onExplorePress }: EmptyInvestmentsStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>No Investments Yet</Text>
      <Text style={styles.description}>
        Start by exploring opportunities and indicating your interest in projects you believe in.
      </Text>
      {onExplorePress && (
        <Button onPress={onExplorePress} style={styles.button}>
          Explore Opportunities
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  button: {
    minWidth: 200,
  },
});
