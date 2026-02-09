import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { Badge } from '../ui/Badge';
import { getStatusColor, getStatusDisplayName, spacing } from '../../lib/theme';

interface OpportunityStatusBadgeProps {
  status: string;
  showIcon?: boolean;
}

export function OpportunityStatusBadge({ status, showIcon = true }: OpportunityStatusBadgeProps) {
  const statusColor = getStatusColor(status);
  const icon = getStatusIcon(status);

  return (
    <Badge color={statusColor}>
      <View style={styles.container}>
        {showIcon && icon && (
          <Ionicons name={icon} size={12} color={statusColor} style={styles.icon} />
        )}
        {getStatusDisplayName(status)}
      </View>
    </Badge>
  );
}

function getStatusIcon(status: string): keyof typeof Ionicons.glyphMap | null {
  switch (status) {
    case 'Offered':
      return 'document-outline';
    case 'Accepted':
      return 'checkmark-circle-outline';
    case 'InterestGathering':
      return 'hand-left-outline';
    case 'Allocating':
      return 'pie-chart-outline';
    case 'Collecting':
      return 'wallet-outline';
    case 'Deposited':
      return 'checkmark-done-outline';
    case 'Cancelled':
      return 'close-circle-outline';
    case 'Concluded':
      return 'flag-outline';
    case 'Interested':
      return 'heart-outline';
    case 'Allocated':
      return 'checkmark-outline';
    case 'Rejected':
      return 'close-outline';
    case 'Refunded':
      return 'refresh-outline';
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
});
