import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Investment } from '../../types';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  getStatusColor,
  getStatusDisplayName,
} from '../../lib/theme';

interface InvestmentCardProps {
  investment: Investment;
  onDepositPress?: () => void;
}

export function InvestmentCard({ investment, onDepositPress }: InvestmentCardProps) {
  const statusColor = getStatusColor(investment.status);
  const showDepositButton = investment.status === 'Allocated';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {investment.plot_name}
          </Text>
          <Text style={styles.subtitle}>{investment.grove_name}</Text>
        </View>
        <Badge color={statusColor}>{getStatusDisplayName(investment.status)}</Badge>
      </View>

      <View style={styles.stats}>
        <StatItem
          label="Requested"
          value={`$${parseFloat(investment.requested_allotment).toLocaleString()}`}
        />
        <View style={styles.divider} />
        <StatItem
          label="Allocated"
          value={`$${parseFloat(investment.allotment || '0').toLocaleString()}`}
        />
        <View style={styles.divider} />
        <StatItem
          label="Deposited"
          value={`$${parseFloat(investment.deposit_amount || '0').toLocaleString()}`}
          highlight
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          {new Date(investment.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        {showDepositButton && onDepositPress && (
          <TouchableOpacity style={styles.depositButton} onPress={onDepositPress}>
            <Text style={styles.depositButtonText}>Deposit Now</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {investment.nft_receipt_mint && (
        <View style={styles.receiptContainer}>
          <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.receiptText} numberOfLines={1}>
            Receipt: {investment.nft_receipt_mint.slice(0, 8)}...
          </Text>
        </View>
      )}
    </Card>
  );
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
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
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
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
  statValueHighlight: {
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  depositButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  receiptText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
});
