/**
 * Sentry Configuration for Canopy Mobile App
 *
 * Provides error tracking, logging, and performance monitoring
 *
 * Environment setup:
 * - development: Local dev builds (__DEV__ = true)
 * - preview: Internal testing builds (EAS preview)
 * - production: Solana Seeker dApp Store releases
 *
 * Set EXPO_PUBLIC_SENTRY_ENVIRONMENT in eas.json env to override.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Get DSN from environment variable
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

// Get app version info for release tracking
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ||
  Constants.expoConfig?.android?.versionCode?.toString() ||
  '1';
const BUNDLE_ID =
  Constants.expoConfig?.ios?.bundleIdentifier ||
  Constants.expoConfig?.android?.package ||
  'com.canopy.mobile';

/**
 * Determine environment based on build configuration
 * Priority: EXPO_PUBLIC_SENTRY_ENVIRONMENT > __DEV__ detection
 */
const getEnvironment = (): string => {
  // Allow explicit override via environment variable
  const envOverride = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT;
  if (envOverride) {
    return envOverride;
  }

  // Development builds
  if (__DEV__) {
    return 'development';
  }

  // Default to production for release builds
  // For preview/staging, set EXPO_PUBLIC_SENTRY_ENVIRONMENT=preview in eas.json
  return 'production';
};

/**
 * Get release identifier in format: bundleId@version+buildNumber
 * Example: com.canopy.mobile@1.0.0+42
 */
const getRelease = (): string => {
  return `${BUNDLE_ID}@${APP_VERSION}+${BUILD_NUMBER}`;
};

/**
 * Get distribution identifier (build number)
 */
const getDist = (): string => {
  return BUILD_NUMBER;
};

// Create navigation integration for screen tracking (must be created before init)
export const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

/**
 * Initialize Sentry with proper configuration
 * Call this at app startup before any other code
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured - error tracking disabled');
    return;
  }

  const environment = getEnvironment();
  const release = getRelease();
  const dist = getDist();

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    release,
    dist,

    // Only enable Sentry debug logging when Sentry is actually sending events.
    // In dev, Sentry is disabled (see `enabled` below) so debug logs just produce
    // noisy "Transport disabled" console errors.
    debug: false,

    // Capture 100% of transactions for performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Profile 100% of sampled transactions in production
    profilesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Integrations for tracing
    integrations: [
      // React Navigation integration for screen tracking
      routingInstrumentation,
      // HTTP client tracing (fetch/XHR)
      Sentry.httpClientIntegration(),
    ],

    // Enable native crash reporting
    enableNativeCrashHandling: true,

    // Attach stack traces to all messages
    attachStacktrace: true,

    // Enable auto session tracking
    enableAutoSessionTracking: true,

    // Session timeout in milliseconds (30 seconds)
    sessionTrackingIntervalMillis: 30000,

    // Don't send events in development unless explicitly enabled
    enabled: !__DEV__ || !!process.env.EXPO_PUBLIC_SENTRY_DEV_ENABLED,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Scrub wallet private keys if they somehow end up in error data
      if (event.extra) {
        const extraStr = JSON.stringify(event.extra);
        if (extraStr.includes('privateKey') || extraStr.includes('secretKey')) {
          event.extra = { redacted: 'Contained sensitive key data' };
        }
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });

  console.warn('[Sentry] Initialized:', { environment, release, dist });
}

/**
 * Set user context when user logs in
 */
export function setSentryUser(userId: string, walletAddress?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    username: username || undefined,
  });

  if (walletAddress) {
    Sentry.setTag('wallet_address', walletAddress);
  }
}

/**
 * Clear user context on logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setTag('wallet_address', undefined);
}

/**
 * Set network context
 */
export function setSentryNetwork(network: string, apiUrl: string): void {
  Sentry.setTag('network', network);
  Sentry.setTag('api_url', apiUrl);
}

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error | unknown,
  context?: {
    operation?: string;
    component?: string;
    userId?: string;
    walletAddress?: string;
    network?: string;
    extra?: Record<string, unknown>;
  }
): string {
  const eventId = Sentry.captureException(error, {
    tags: {
      operation: context?.operation,
      component: context?.component,
      network: context?.network,
    },
    extra: {
      userId: context?.userId,
      walletAddress: context?.walletAddress,
      ...context?.extra,
    },
  });

  return eventId;
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op: operation,
  });
}

/**
 * Wrap a component with Sentry error boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Wrap the App component with Sentry for automatic tracing
 */
export const wrapWithSentry = Sentry.wrap;

// Re-export Sentry for direct access if needed
export { Sentry };
