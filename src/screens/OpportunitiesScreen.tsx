import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Interest', value: 'InterestGathering' },
  { label: 'Allocating', value: 'Allocating' },
  { label: 'Collecting', value: 'Collecting' },
];

export default function OpportunitiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { plots, isLoading, refreshPlots } = useCanopy();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPlots();
    setRefreshing(false);
  };

  // Filter plots by search query and status
  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      const title = plot.title || plot.name;
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || plot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plots, searchQuery, statusFilter]);

  const renderItem = ({ item }: { item: Plot }) => {
    const opportunity = plotToOpportunity(item);
    const progress = (parseFloat(opportunity.collected) / parseFloat(opportunity.target)) * 100;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OpportunityDetails', { pda: item.plot_pda })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {opportunity.title}
            </Text>
            <Text style={styles.cardGroup}>{opportunity.group}</Text>
          </View>
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

        <Text style={styles.cardDescription} numberOfLines={2}>
          {opportunity.shortDescription}
        </Text>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Target</Text>
            <Text style={styles.statValue}>${formatUSDC(opportunity.target)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Raised</Text>
            <Text style={styles.statValue}>${formatUSDC(opportunity.collected)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min.</Text>
            <Text style={styles.statValue}>${formatUSDC(opportunity.minimumInvestment)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(1)}% funded</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && plots.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search opportunities..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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

      {/* List */}
      <FlatList
        data={filteredPlots}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.plot_pda || `plot-${index}`}
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
            <Ionicons name="leaf-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateText}>No opportunities found</Text>
          </View>
        }
      />
    </SafeAreaView>
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
  searchContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.text,
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
    marginBottom: spacing.sm,
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
  cardGroup: {
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
  cardDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
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
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
