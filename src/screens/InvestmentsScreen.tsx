import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCanopy } from '../contexts/CanopyContext';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontFamily,
  getStatusColor,
  getStatusDisplayName,
  formatUSDC,
} from '../lib/theme';
import { getUserInvestments, getInvestmentSummary } from '../lib/api';
import { Investment, InvestmentSummary } from '../types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Interested', value: 'Interested' },
  { label: 'Allocated', value: 'Allocated' },
  { label: 'Deposited', value: 'Deposited' },
];

export default function InvestmentsScreen() {
  const { walletAddress } = useCanopy();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const [investmentsData, summaryData] = await Promise.all([
        getUserInvestments(walletAddress),
        getInvestmentSummary(walletAddress),
      ]);
      setInvestments(investmentsData);
      setSummary(summaryData);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredInvestments = statusFilter
    ? investments.filter((inv) => inv.status === statusFilter)
    : investments;

  const renderItem = ({ item }: { item: Investment }) => <InvestmentCard investment={item} />;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="wallet-outline"
              label="Total Deposited"
              value={`$${formatUSDC(summary.total_deposited)}`}
              color={colors.primary}
            />
            <SummaryCard
              icon="trending-up-outline"
              label="Allocated"
              value={`$${formatUSDC(summary.total_allocated)}`}
              color={colors.warning}
            />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="hourglass-outline"
              label="Requested"
              value={`$${formatUSDC(summary.total_requested)}`}
              color={colors.info}
            />
            <SummaryCard
              icon="layers-outline"
              label="Positions"
              value={summary.total_investments.toString()}
              color={colors.statusCollecting}
            />
          </View>
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              statusFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === filter.value && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Investments List */}
      <FlatList
        data={filteredInvestments}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id?.toString() || `investment-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No investments yet</Text>
            <Text style={styles.emptyStateText}>
              Start investing in opportunities to see them here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  const statusColor = getStatusColor(investment.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {investment.plot_name}
          </Text>
          <Text style={styles.cardSubtitle}>{investment.grove_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusDisplayName(investment.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Requested</Text>
          <Text style={styles.detailValue}>${formatUSDC(investment.requested_allotment)}</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Allocated</Text>
          <Text style={styles.detailValue}>${formatUSDC(investment.allotment)}</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Deposited</Text>
          <Text style={[styles.detailValue, styles.detailValuePrimary]}>
            ${formatUSDC(investment.deposit_amount)}
          </Text>
        </View>
      </View>

      {investment.nft_receipt_mint && (
        <View style={styles.receiptContainer}>
          <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
          <Text style={styles.receiptText} numberOfLines={1}>
            Receipt: {investment.nft_receipt_mint.slice(0, 8)}...
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{new Date(investment.created_at).toLocaleDateString()}</Text>
        {investment.plot_status && (
          <Text style={styles.plotStatusText}>
            Plot: {getStatusDisplayName(investment.plot_status)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  summaryContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.subheading,
  },
  filterButtonTextActive: {
    color: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.subheading,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  detailColumn: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  detailValuePrimary: {
    color: colors.primary,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  receiptText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.primary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  plotStatusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
