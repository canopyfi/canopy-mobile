import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles.button,
        sizeStyles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.background : colors.primary}
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

function getVariantStyles(variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {
        button: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
        text: { color: colors.text },
      };
    case 'outline':
      return {
        button: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
        text: { color: colors.primary },
      };
    case 'ghost':
      return {
        button: { backgroundColor: 'transparent' },
        text: { color: colors.primary },
      };
    case 'destructive':
      return {
        button: { backgroundColor: colors.error },
        text: { color: colors.text },
      };
    default:
      return {
        button: { backgroundColor: colors.primary },
        text: { color: colors.background },
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return {
        button: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
        text: { fontSize: fontSize.sm },
      };
    case 'lg':
      return {
        button: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
        text: { fontSize: fontSize.lg },
      };
    default:
      return {
        button: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
        text: { fontSize: fontSize.base },
      };
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
