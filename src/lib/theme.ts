/**
 * Theme constants for Canopy Mobile App
 * Based on Canopy Brand Guideline v1.0 (September 2025)
 */

export const colors = {
  // Primary brand colors (from Brand Guide)
  primary: '#54F097', // Spring Green - main accent color
  primaryDark: '#015432', // Castleton Green - dark green accent

  // Background colors (Zomp Green base)
  background: '#1b2a24', // Zomp Green - main dark background
  backgroundSecondary: '#243830', // Slightly lighter for cards/elevated surfaces
  backgroundTertiary: '#2d4439', // Even lighter for nested elements
  card: '#243830', // Card background

  // Text colors
  text: '#FFFFFF', // White for primary text on dark backgrounds
  textSecondary: '#A8B5AE', // Muted green-tinted gray for secondary text
  textMuted: '#6B7D74', // More muted for tertiary text

  // Secondary palette colors
  lightViolet: '#BDBDE5', // Accent color for special elements
  coolGrey: '#E4E4ED', // Neutral light color
  softWhite: '#F9F7F8', // Off-white for light backgrounds

  // Border colors
  border: '#3d5249', // Subtle border matching background
  borderLight: '#4d6459', // Lighter border for emphasis

  // Status colors (using brand-aligned colors)
  success: '#54F097', // Spring Green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  info: '#BDBDE5', // Light Violet

  // Status-specific colors (from PlotStatus)
  statusOffered: '#6B7D74',
  statusAccepted: '#BDBDE5', // Light Violet
  statusInterestGathering: '#54F097', // Spring Green
  statusAllocating: '#F59E0B',
  statusCollecting: '#8B5CF6',
  statusDeposited: '#06B6D4',
  statusCancelled: '#EF4444',
  statusConcluded: '#6B7D74',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

// Font families from Brand Guide
// - Satoshi Black: Headlines, hero text, high-impact statements
// - Space Grotesk Medium: Subheadlines, section headers, UI elements
// - Space Grotesk Regular: Body text
// Fonts are embedded natively via expo-font plugin - use filename without extension
export const fontFamily = {
  // Headlines (Satoshi Black)
  heading: 'Satoshi-Black',
  // Subheadlines and UI elements (Space Grotesk Medium)
  subheading: 'SpaceGrotesk_500Medium',
  // Body text (Space Grotesk Regular)
  body: 'SpaceGrotesk_400Regular',
  // Fine print (Space Grotesk Light)
  caption: 'SpaceGrotesk_300Light',
};

// Helper to get status color
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    Offered: colors.statusOffered,
    Accepted: colors.statusAccepted,
    InterestGathering: colors.statusInterestGathering,
    Allocating: colors.statusAllocating,
    Collecting: colors.statusCollecting,
    Deposited: colors.statusDeposited,
    Cancelled: colors.statusCancelled,
    Concluded: colors.statusConcluded,
    Interested: colors.statusInterestGathering,
    Allocated: colors.statusAllocating,
    Rejected: colors.statusCancelled,
    Refunded: colors.statusConcluded,
  };
  return colorMap[status] || colors.textMuted;
}

// Helper to get status display name
export function getStatusDisplayName(status: string): string {
  const nameMap: Record<string, string> = {
    Offered: 'Offered',
    Accepted: 'Accepted',
    InterestGathering: 'Interest Gathering',
    Allocating: 'Allocating',
    Collecting: 'Collecting',
    Deposited: 'Deposited',
    Cancelled: 'Cancelled',
    Concluded: 'Concluded',
    Interested: 'Interested',
    Allocated: 'Allocated',
    Rejected: 'Rejected',
    Refunded: 'Refunded',
  };
  return nameMap[status] || status;
}

// USDC has 6 decimal places
const USDC_DECIMALS = 6;

/**
 * Format a USDC value from smallest unit (6 decimals) to display string
 * @param value - The value in smallest unit (e.g., 1000000 = $1.00)
 * @param showDecimals - Whether to show decimal places (default: false for whole numbers)
 */
export function formatUSDC(
  value: string | number | bigint | null | undefined,
  showDecimals = false
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const numValue = typeof value === 'bigint' ? Number(value) : parseFloat(String(value));
  if (isNaN(numValue)) {
    return '0';
  }

  const displayValue = numValue / Math.pow(10, USDC_DECIMALS);

  if (showDecimals) {
    return displayValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
