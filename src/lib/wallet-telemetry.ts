/**
 * Wallet Telemetry for Canopy Mobile App
 *
 * Provides Sentry tracking for wallet transactions with structured tags,
 * error classification, and performance metrics.
 */

import * as Sentry from '@sentry/react-native';

export type WalletOperation =
  | 'wallet_connect'
  | 'indicate_interest'
  | 'deposit_watering'
  | 'get_balance'
  | 'sign_transaction';

export type FailureReason =
  | 'user_rejected'
  | 'wallet_not_connected'
  | 'wallet_not_installed'
  | 'wallet_connection_failed'
  | 'wallet_mismatch'
  | 'insufficient_funds'
  | 'insufficient_sol'
  | 'account_not_found'
  | 'account_not_initialized'
  | 'program_error'
  | 'timeout'
  | 'network_error'
  | 'unknown';

/**
 * Classify a wallet/transaction error into a tagged reason.
 */
export function classifyWalletError(error: Error | string): FailureReason {
  const msg = typeof error === 'string' ? error : error.message || '';
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('rejected the request'))
    return 'user_rejected';
  if (lower.includes('not installed') || (lower.includes('not found') && lower.includes('wallet')))
    return 'wallet_not_installed';
  if (lower.includes('wallet mismatch')) return 'wallet_mismatch';
  if (lower.includes('wallet not connected') || lower.includes('no wallet selected'))
    return 'wallet_not_connected';
  if (lower.includes('failed to connect')) return 'wallet_connection_failed';
  if (lower.includes('no record of a prior credit') || lower.includes('insufficient'))
    return 'insufficient_sol';
  if (lower.includes('accountnotinitialized') || lower.includes('token account not found'))
    return 'account_not_initialized';
  if (lower.includes('not found') || lower.includes('account not found'))
    return 'account_not_found';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (lower.includes('network') || lower.includes('failed to fetch')) return 'network_error';
  if (lower.includes('0x') || lower.includes('program error') || lower.includes('instruction'))
    return 'program_error';

  return 'unknown';
}

/**
 * Build metric tags from the raw attributes map.
 */
function buildTags(
  operation: WalletOperation,
  attrs: Record<string, string | number>
): Record<string, string> {
  const result: Record<string, string> = { operation };
  if (attrs.wallet_type) result.wallet_type = String(attrs.wallet_type);
  if (attrs.network) result.network = String(attrs.network);
  return result;
}

/**
 * Wrap an async wallet operation in a Sentry span with structured tags.
 * Tracks start, completion, and failure with breadcrumbs.
 * On error, captures the exception tagged with operation + failure reason.
 */
export async function trackWalletTransaction<T>(
  operation: WalletOperation,
  attributes: Record<string, string | number | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const filteredAttrs: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (v !== undefined) filteredAttrs[k] = v;
  }

  const tags = buildTags(operation, filteredAttrs);
  const startTime = Date.now();

  Sentry.addBreadcrumb({
    category: 'wallet',
    message: `${operation} started`,
    level: 'info',
    data: filteredAttrs,
  });

  return Sentry.startSpan(
    {
      name: `wallet.${operation}`,
      op: 'wallet.transaction',
      attributes: filteredAttrs,
    },
    async (span) => {
      try {
        const result = await fn();
        const durationMs = Date.now() - startTime;

        span.setStatus({ code: 1, message: 'ok' });

        Sentry.addBreadcrumb({
          category: 'wallet',
          message: `${operation} completed in ${durationMs}ms`,
          level: 'info',
          data: { ...filteredAttrs, duration_ms: durationMs },
        });

        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const err = error instanceof Error ? error : new Error(String(error));
        const reason = classifyWalletError(err);

        span.setStatus({ code: 2, message: reason });

        Sentry.addBreadcrumb({
          category: 'wallet',
          message: `${operation} failed: ${reason}`,
          level: 'error',
          data: { ...filteredAttrs, failure_reason: reason, duration_ms: durationMs },
        });

        // User rejections and insufficient funds are business-as-usual
        // Only capture real errors as Sentry issues
        if (
          reason !== 'user_rejected' &&
          reason !== 'insufficient_funds' &&
          reason !== 'insufficient_sol'
        ) {
          Sentry.captureException(err, {
            tags: {
              ...tags,
              'wallet.operation': operation,
              'wallet.failure_reason': reason,
            },
            extra: { ...filteredAttrs, duration_ms: durationMs },
            fingerprint: ['wallet', operation, reason],
          });
        }

        throw error;
      }
    }
  );
}

/**
 * Capture a wallet transaction failure that was returned as { success: false }
 * rather than thrown (SDK pattern).
 */
export function captureWalletFailure(
  operation: WalletOperation,
  errorMessage: string,
  attributes: Record<string, string | number | undefined> = {}
): void {
  const reason = classifyWalletError(errorMessage);

  const filteredAttrs: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (v !== undefined) filteredAttrs[k] = v;
  }

  const tags = buildTags(operation, filteredAttrs);

  Sentry.addBreadcrumb({
    category: 'wallet',
    message: `${operation} failed (sdk): ${reason}`,
    level: 'error',
    data: { ...filteredAttrs, failure_reason: reason, error: errorMessage },
  });

  // User rejections and insufficient funds are business-as-usual
  // Only capture real errors as Sentry issues
  if (
    reason !== 'user_rejected' &&
    reason !== 'insufficient_funds' &&
    reason !== 'insufficient_sol'
  ) {
    Sentry.captureException(new Error(`Wallet ${operation} failed: ${errorMessage}`), {
      tags: {
        ...tags,
        'wallet.operation': operation,
        'wallet.failure_reason': reason,
      },
      extra: { ...filteredAttrs, error: errorMessage },
      fingerprint: ['wallet', operation, reason],
    });
  }
}
