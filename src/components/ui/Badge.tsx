import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../lib/theme';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ children, variant = 'default', color, style, textStyle }: BadgeProps) {
  const variantStyles = getVariantStyles(variant, color);

  return (
    <View style={[styles.badge, variantStyles.container, style]}>
      <Text style={[styles.text, variantStyles.text, textStyle]}>{children}</Text>
    </View>
  );
}

function getVariantStyles(variant: BadgeVariant, customColor?: string) {
  if (customColor) {
    return {
      container: {
        backgroundColor: `${customColor}20`,
      },
      text: {
        color: customColor,
      },
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        container: { backgroundColor: colors.backgroundTertiary },
        text: { color: colors.textSecondary },
      };
    case 'success':
      return {
        container: { backgroundColor: `${colors.success}20` },
        text: { color: colors.success },
      };
    case 'warning':
      return {
        container: { backgroundColor: `${colors.warning}20` },
        text: { color: colors.warning },
      };
    case 'error':
      return {
        container: { backgroundColor: `${colors.error}20` },
        text: { color: colors.error },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: { color: colors.text },
      };
    default:
      return {
        container: { backgroundColor: `${colors.primary}20` },
        text: { color: colors.primary },
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
