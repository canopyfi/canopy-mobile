import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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
import { useCanopy } from '../contexts/CanopyContext';
import { Plot, plotToOpportunity, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'OpportunityDetails'>;

export default function OpportunityDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { pda } = route.params;
  const { getPlotByPda, investments } = useCanopy();

  const [plot, setPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlot = async () => {
    try {
      const data = await getPlotByPda(pda);
      setPlot(data);
    } catch {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlot();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!plot) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Opportunity not found</Text>
      </View>
    );
  }

  const opportunity = plotToOpportunity(plot);
  const progress = (parseFloat(opportunity.collected) / parseFloat(opportunity.target)) * 100;

  // Find user's existing investment for this plot
  const plotPda = plot.plot_pda || plot.pda;
  const existingInvestment = investments.find((inv) => inv.plot_pda === plotPda);
  const hasIndicatedInterest =
    existingInvestment &&
    (existingInvestment.status === 'Interested' || existingInvestment.status === 'Allocated');

  const canInvest =
    (plot.status === 'InterestGathering' && !hasIndicatedInterest) ||
    plot.status === 'Collecting';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Image */}
        {opportunity.image ? (
          <Image source={{ uri: opportunity.image }} style={styles.headerImage} />
        ) : (
          <View style={styles.headerImagePlaceholder}>
            <Ionicons name="leaf" size={64} color={colors.primary} />
          </View>
        )}

        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{opportunity.title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(opportunity.status)}20` },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(opportunity.status) }]}>
                {getStatusDisplayName(opportunity.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.group}>{opportunity.group}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Funding Progress</Text>
            <Text style={styles.progressPercent}>{progress.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <View style={styles.progressDetails}>
            <Text style={styles.progressAmount}>${formatUSDC(opportunity.collected)} raised</Text>
            <Text style={styles.progressTarget}>of ${formatUSDC(opportunity.target)}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="cash-outline"
            label="Target Raise"
            value={`$${formatUSDC(opportunity.target)}`}
          />
          <StatCard
            icon="trending-up-outline"
            label="Valuation"
            value={`$${formatUSDC(opportunity.valuation)}`}
          />
          <StatCard
            icon="wallet-outline"
            label="Min. Group Investment"
            value={`$${formatUSDC(plot.minimum_investment)}`}
          />
          <StatCard
            icon="people-outline"
            label="Investors"
            value={plot.investor_count?.toString() || '0'}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            {opportunity.longDescription || opportunity.shortDescription}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsList}>
            <DetailRow label="Seedling" value={plot.seedling_name || 'N/A'} />
            <DetailRow label="Growth Cycle" value={plot.growth_cycle_name || 'N/A'} />
            <DetailRow label="Grove" value={plot.grove_name || 'N/A'} />
            <DetailRow
              label="Start Date"
              value={plot.start_date ? new Date(plot.start_date).toLocaleDateString() : 'TBD'}
            />
            <DetailRow
              label="End Date"
              value={plot.end_date ? new Date(plot.end_date).toLocaleDateString() : 'TBD'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Existing Interest Banner */}
      {hasIndicatedInterest && plot.status === 'InterestGathering' && (
        <View style={styles.footer}>
          <View style={styles.existingInterestCard}>
            <View style={styles.existingInterestRow}>
              <View style={styles.existingInterestInfo}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.existingInterestLabel}>Your Interest</Text>
              </View>
              <Text style={styles.existingInterestAmount}>
                ${formatUSDC(existingInvestment.requested_allotment)}
              </Text>
            </View>
            {existingInvestment.status === 'Allocated' && (
              <Text style={styles.existingInterestStatus}>
                Allocated: ${formatUSDC(existingInvestment.allotment)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Invest Button */}
      {canInvest && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.investButton}
            onPress={() =>
              navigation.navigate('Invest', {
                pda,
                title: opportunity.title,
              })
            }
          >
            <Ionicons name="leaf" size={20} color={colors.background} />
            <Text style={styles.investButtonText}>
              {plot.status === 'Collecting' ? 'Deposit Now' : 'Indicate Interest'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 80, // Account for footer button
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
  },
  group: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  progressSection: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressAmount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  progressTarget: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  detailsList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  investButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  existingInterestCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  existingInterestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  existingInterestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  existingInterestLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  existingInterestAmount: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
    color: colors.primary,
  },
  existingInterestStatus: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
