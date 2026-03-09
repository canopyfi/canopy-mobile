import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useCanopy } from '../contexts/CanopyContext';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontFamily,
  getStatusColor,
  formatUSDC,
} from '../lib/theme';
import { Investment, plotToOpportunity, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { matricaProfile, plots, investments, isLoading, refreshPlots, refreshInvestments } =
    useCanopy();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh data when screen gains focus (e.g. returning from detail/invest screens)
  useFocusEffect(
    useCallback(() => {
      refreshPlots();
      refreshInvestments();
    }, [refreshPlots, refreshInvestments])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPlots(), refreshInvestments()]);
    setRefreshing(false);
  };

  const totalInvested = investments
    .filter((inv) => inv.status === 'Deposited')
    .reduce((sum, inv) => sum + parseFloat(inv.allotment || '0'), 0);

  const activeInvestments = investments.filter(
    (inv) => inv.status === 'Interested' || inv.status === 'Allocated'
  ).length;

  if (isLoading && plots.length === 0 && investments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome{matricaProfile?.username ? `, ${matricaProfile.username}` : ' back'}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard title="Total Invested" value={`$${formatUSDC(totalInvested)}`} icon="wallet" />
          <StatCard
            title="Active Positions"
            value={activeInvestments.toString()}
            icon="trending-up"
          />
        </View>

        {/* Active Opportunities */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Opportunities</Text>
          {}
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Opportunities' } as any)}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {plots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateText}>No active opportunities</Text>
          </View>
        ) : (
          plots.slice(0, 3).map((plot, index) => {
            const opportunity = plotToOpportunity(plot);
            return (
              <OpportunityCard
                key={`plot-${plot.plot_pda ?? index}`}
                opportunity={opportunity}
                onPress={() => navigation.navigate('OpportunityDetails', { pda: plot.plot_pda })}
              />
            );
          })
        )}

        {/* Recent Investments */}
        {investments.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Investments</Text>
              {}
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Investments' } as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {investments.slice(0, 3).map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function OpportunityCard({
  opportunity,
  onPress,
}: {
  opportunity: ReturnType<typeof plotToOpportunity>;
  onPress: () => void;
}) {
  const progress = (parseFloat(opportunity.collected) / parseFloat(opportunity.target)) * 100;

  return (
    <TouchableOpacity style={styles.opportunityCard} onPress={onPress}>
      <View style={styles.opportunityHeader}>
        <Text style={styles.opportunityTitle} numberOfLines={1}>
          {opportunity.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(opportunity.status)}20` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(opportunity.status) }]}>
            {opportunity.status}
          </Text>
        </View>
      </View>

      <Text style={styles.opportunityDescription} numberOfLines={2}>
        {opportunity.shortDescription}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          ${formatUSDC(opportunity.collected)} / ${formatUSDC(opportunity.target)}
        </Text>
      </View>

      <View style={styles.opportunityFooter}>
        <Text style={styles.opportunityGroup}>{opportunity.group}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  return (
    <View style={styles.investmentCard}>
      <View style={styles.investmentHeader}>
        <Text style={styles.investmentTitle} numberOfLines={1}>
          {investment.plot_name}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(investment.status)}20` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(investment.status) }]}>
            {investment.status}
          </Text>
        </View>
      </View>

      <View style={styles.investmentDetails}>
        <View style={styles.investmentDetail}>
          <Text style={styles.detailLabel}>Requested</Text>
          <Text style={styles.detailValue}>${formatUSDC(investment.requested_allotment)}</Text>
        </View>
        <View style={styles.investmentDetail}>
          <Text style={styles.detailLabel}>Allocated</Text>
          <Text style={styles.detailValue}>${formatUSDC(investment.allotment)}</Text>
        </View>
        <View style={styles.investmentDetail}>
          <Text style={styles.detailLabel}>Deposited</Text>
          <Text style={styles.detailValue}>
            ${formatUSDC(investment.status === 'Deposited' ? investment.allotment : '0')}
          </Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.subheading,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  opportunityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  opportunityTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
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
  opportunityDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  opportunityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opportunityGroup: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  investmentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  investmentTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  investmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  investmentDetail: {
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
});
