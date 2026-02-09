import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../ui/Card';
import { InvestmentSummary } from '../../types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../lib/theme';

interface DashboardMetricsProps {
  summary: InvestmentSummary | null;
}

export function DashboardMetrics({ summary }: DashboardMetricsProps) {
  if (!summary) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MetricCard
          icon="wallet"
          label="Total Deposited"
          value={`$${parseFloat(summary.total_deposited).toLocaleString()}`}
          color={colors.primary}
        />
        <MetricCard
          icon="trending-up"
          label="Total Allocated"
          value={`$${parseFloat(summary.total_allocated).toLocaleString()}`}
          color={colors.info}
        />
      </View>
      <View style={styles.row}>
        <MetricCard
          icon="layers"
          label="Active Positions"
          value={summary.unique_plots.toString()}
          color={colors.warning}
        />
        <MetricCard
          icon="time"
          label="Pending Interest"
          value={summary.interested_count.toString()}
          color={colors.textSecondary}
        />
      </View>
    </View>
  );
}

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
