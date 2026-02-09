/**
 * Logger utility that wraps console methods.
 * - Debug/info logs only appear in dev mode
 * - Warn/error logs always appear and are sent to Sentry as breadcrumbs
 */

import { addBreadcrumb } from './sentry';

const isDev = __DEV__;

function formatMessage(args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('[INFO]', ...args);
    }
    // Also add as Sentry breadcrumb for context
    addBreadcrumb(formatMessage(args), 'log', {}, 'info');
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
    addBreadcrumb(formatMessage(args), 'log', {}, 'warning');
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    addBreadcrumb(formatMessage(args), 'log', {}, 'error');
  },
};

export default logger;
