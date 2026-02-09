import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { OpportunityCard } from './OpportunityCard';
import { Opportunity } from '../../types';
import { colors, spacing, fontSize } from '../../lib/theme';

interface OpportunitiesGridProps {
  opportunities: Opportunity[];
  onOpportunityPress: (opportunity: Opportunity) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export function OpportunitiesGrid({
  opportunities,
  onOpportunityPress,
  refreshing = false,
  onRefresh,
  ListHeaderComponent,
}: OpportunitiesGridProps) {
  const renderItem = ({ item }: { item: Opportunity }) => (
    <OpportunityCard opportunity={item} onPress={() => onOpportunityPress(item)} />
  );

  return (
    <FlatList
      data={opportunities}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id?.toString() || `opportunity-${index}`}
      contentContainerStyle={styles.container}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState />}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    />
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Opportunities</Text>
      <Text style={styles.emptyStateText}>
        There are no opportunities available at the moment. Check back later for new investment
        opportunities.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
