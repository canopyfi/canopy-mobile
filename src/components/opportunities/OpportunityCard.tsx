import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { Opportunity } from '../../types';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  getStatusColor,
  getStatusDisplayName,
} from '../../lib/theme';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onPress: () => void;
}

export function OpportunityCard({ opportunity, onPress }: OpportunityCardProps) {
  const progress = (parseFloat(opportunity.collected) / parseFloat(opportunity.target)) * 100;
  const statusColor = getStatusColor(opportunity.status);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {opportunity.title}
          </Text>
          <Text style={styles.group}>{opportunity.group}</Text>
        </View>
        <Badge color={statusColor}>{getStatusDisplayName(opportunity.status)}</Badge>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {opportunity.shortDescription}
      </Text>

      <View style={styles.stats}>
        <StatItem label="Target" value={`$${parseFloat(opportunity.target).toLocaleString()}`} />
        <StatItem label="Raised" value={`$${parseFloat(opportunity.collected).toLocaleString()}`} />
        <StatItem
          label="Min."
          value={`$${parseFloat(opportunity.minimumInvestment || '0').toLocaleString()}`}
        />
      </View>

      <View style={styles.progressContainer}>
        <Progress value={progress} />
        <Text style={styles.progressText}>{progress.toFixed(1)}% funded</Text>
      </View>

      <View style={styles.footer}>
        {opportunity.investorCount !== undefined && (
          <View style={styles.investors}>
            <Ionicons name="people-outline" size={16} color={colors.textMuted} />
            <Text style={styles.investorCount}>{opportunity.investorCount} investors</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  group: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  progressContainer: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  investorCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
