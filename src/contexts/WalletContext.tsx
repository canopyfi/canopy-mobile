import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  PublicKey,
  Connection,
  clusterApiUrl,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import * as SecureStore from 'expo-secure-store';
import { captureError, addBreadcrumb, captureMessage, Sentry } from '../lib/sentry';
import { logger } from '../lib/logger';

// App identity for wallet connection
const APP_IDENTITY = {
  name: 'Canopy',
  uri: 'https://canopy.app',
  icon: 'favicon.ico',
};

// Storage keys
const AUTH_TOKEN_KEY = 'canopy_auth_token';
const WALLET_KEY = 'canopy_wallet_address';

// Solana cluster configuration
const CLUSTER = __DEV__ ? 'devnet' : 'mainnet-beta';

interface WalletContextState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  walletAddress: string | null;

  // Connection instance
  connection: Connection;

  // Methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (
    transaction: Transaction | VersionedTransaction
  ) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (
    transactions: (Transaction | VersionedTransaction)[]
  ) => Promise<(Transaction | VersionedTransaction)[]>;
  signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

const WalletContext = createContext<WalletContextState | null>(null);

interface WalletProviderProps {
  children: ReactNode;
  rpcUrl?: string;
}

export function WalletProvider({ children, rpcUrl }: WalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Create connection
  const connection = useMemo(() => {
    return new Connection(rpcUrl || clusterApiUrl(CLUSTER), 'confirmed');
  }, [rpcUrl]);

  const walletAddress = useMemo(() => {
    return publicKey?.toBase58() || null;
  }, [publicKey]);

  // Load stored auth token on mount
  React.useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const storedWallet = await SecureStore.getItemAsync(WALLET_KEY);

      if (storedToken && storedWallet) {
        // Only set the auth token for faster reauthorization
        // Don't set connected - user still needs to go through MWA
        setAuthToken(storedToken);
        setPublicKey(new PublicKey(storedWallet));
        // Note: NOT setting connected here - MWA session needs to be validated
      }
    } catch {
      // Ignore errors when loading stored auth
    }
  };

  const saveAuth = async (token: string, wallet: string) => {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      await SecureStore.setItemAsync(WALLET_KEY, wallet);
    } catch {
      // Ignore storage errors
    }
  };

  const clearAuth = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(WALLET_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const connect = useCallback(async () => {
    logger.debug(
      '[WalletContext] connect called, connecting:',
      connecting,
      'connected:',
      connected
    );
    if (connecting) {
      logger.debug('[WalletContext] Already connecting, returning');
      addBreadcrumb('Wallet connect skipped - already connecting', 'wallet', {}, 'warning');
      return;
    }
    if (connected) {
      logger.debug('[WalletContext] Already connected, returning');
      return;
    }

    // Track connection attempt start
    const connectionStartTime = Date.now();
    addBreadcrumb('Wallet connection initiated', 'wallet', {
      hasExistingAuthToken: !!authToken,
      cluster: CLUSTER,
    });

    setConnecting(true);
    logger.debug('[WalletContext] Starting MWA transact...');

    try {
      addBreadcrumb('Opening wallet app via MWA', 'wallet');

      const result = await transact(async (wallet: Web3MobileWallet) => {
        logger.debug('[WalletContext] Inside transact, calling authorize...');
        addBreadcrumb('Wallet app opened, requesting authorization', 'wallet');

        const authorizationResult = await wallet.authorize({
          chain: `solana:${CLUSTER}`,
          identity: APP_IDENTITY,
          auth_token: authToken || undefined,
        });

        logger.debug(
          '[WalletContext] Authorization result received:',
          JSON.stringify(authorizationResult, null, 2)
        );

        // Track wallet response details
        addBreadcrumb('Wallet authorization response received', 'wallet', {
          accountCount: authorizationResult.accounts?.length || 0,
          walletName: authorizationResult.wallet_uri_base || 'unknown',
          hasAuthToken: !!authorizationResult.auth_token,
        });

        return authorizationResult;
      });

      logger.debug('[WalletContext] Transact completed, result:', result);

      // Validate result
      if (!result || !result.accounts || result.accounts.length === 0) {
        addBreadcrumb('Wallet returned no accounts', 'wallet', {}, 'error');
        throw new Error('No accounts returned from wallet');
      }

      // Extract the public key from the authorization result
      const addressBytes = result.accounts[0].address as string | Uint8Array;
      logger.debug(
        '[WalletContext] Address from wallet:',
        addressBytes,
        'type:',
        typeof addressBytes
      );

      let authorizedPubkey: PublicKey;
      if (typeof addressBytes === 'string') {
        try {
          authorizedPubkey = new PublicKey(addressBytes);
        } catch {
          const decoded = Buffer.from(addressBytes, 'base64');
          authorizedPubkey = new PublicKey(decoded);
        }
      } else {
        authorizedPubkey = new PublicKey(addressBytes);
      }

      const walletAddress = authorizedPubkey.toBase58();
      const connectionDuration = Date.now() - connectionStartTime;
      logger.debug('[WalletContext] Authorized pubkey:', walletAddress);

      // Update state
      setAuthToken(result.auth_token);
      setPublicKey(authorizedPubkey);
      setConnected(true);
      logger.debug('[WalletContext] State updated, connected set to true');

      // Save auth for reconnection
      await saveAuth(result.auth_token, walletAddress);

      // Track successful connection with details
      addBreadcrumb('Wallet connected successfully', 'wallet', {
        walletAddress,
        walletName: result.wallet_uri_base || 'unknown',
        connectionDurationMs: connectionDuration,
        accountLabel: result.accounts[0].label || 'default',
      });

      // Send a custom event for wallet connections (for analytics)
      captureMessage('Wallet connected', 'info', {
        walletAddress,
        walletName: result.wallet_uri_base || 'unknown',
        cluster: CLUSTER,
        connectionDurationMs: connectionDuration,
        isReauthorization: !!authToken,
      });

      logger.debug('[WalletContext] Auth saved');
    } catch (error) {
      const connectionDuration = Date.now() - connectionStartTime;
      logger.error('[WalletContext] Connect error:', error);

      // Determine error type for better tracking
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      // Check for specific MWA error types
      let errorType = 'unknown';
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        errorType = 'user_cancelled';
        addBreadcrumb(
          'User cancelled wallet connection',
          'wallet',
          {
            connectionDurationMs: connectionDuration,
          },
          'warning'
        );
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorType = 'timeout';
        addBreadcrumb(
          'Wallet connection timed out',
          'wallet',
          {
            connectionDurationMs: connectionDuration,
          },
          'error'
        );
      } else if (errorMessage.includes('not installed') || errorMessage.includes('no wallet')) {
        errorType = 'no_wallet';
        addBreadcrumb('No wallet app found', 'wallet', {}, 'error');
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        errorType = 'user_rejected';
        addBreadcrumb(
          'User rejected wallet authorization',
          'wallet',
          {
            connectionDurationMs: connectionDuration,
          },
          'warning'
        );
      } else {
        addBreadcrumb(
          'Wallet connection failed',
          'wallet',
          {
            errorType: errorName,
            errorMessage,
            connectionDurationMs: connectionDuration,
          },
          'error'
        );
      }

      // Capture error with full context
      captureError(error, {
        operation: 'wallet_connect',
        component: 'WalletContext',
        extra: {
          errorType,
          errorName,
          errorMessage,
          hadAuthToken: !!authToken,
          cluster: CLUSTER,
          rpcUrl,
          connectionDurationMs: connectionDuration,
        },
      });

      // Set Sentry tag for wallet error type (for filtering in dashboard)
      Sentry.setTag('wallet_error_type', errorType);

      setConnected(false);
      setPublicKey(null);
      setAuthToken(null);
      throw error;
    } finally {
      setConnecting(false);
      logger.debug('[WalletContext] Connect finished, connecting set to false');
    }
  }, [connecting, connected, authToken, rpcUrl]);

  const disconnect = useCallback(async () => {
    if (!connected || !authToken) return;

    const disconnectingWallet = publicKey?.toBase58();
    addBreadcrumb('Wallet disconnect initiated', 'wallet', {
      walletAddress: disconnectingWallet,
    });

    try {
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: authToken });
      });
      addBreadcrumb('Wallet deauthorized successfully', 'wallet', {
        walletAddress: disconnectingWallet,
      });
    } catch (error) {
      // Log but don't fail on deauthorization errors
      addBreadcrumb(
        'Wallet deauthorization failed (continuing disconnect)',
        'wallet',
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'warning'
      );
    } finally {
      setConnected(false);
      setPublicKey(null);
      setAuthToken(null);
      await clearAuth();

      addBreadcrumb('Wallet disconnected', 'wallet', {
        previousWallet: disconnectingWallet,
      });

      // Clear wallet tag from Sentry
      Sentry.setTag('wallet_address', undefined);
    }
  }, [connected, authToken, publicKey]);

  const signTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction) => {
      if (!connected) {
        throw new Error('Wallet not connected');
      }

      try {
        addBreadcrumb('Signing transaction', 'wallet');
        const signedTx = await transact(async (wallet: Web3MobileWallet) => {
          await wallet.authorize({
            chain: `solana:${CLUSTER}`,
            identity: APP_IDENTITY,
            auth_token: authToken || undefined,
          });

          const signedTxs = await wallet.signTransactions({
            transactions: [transaction],
          });
          return signedTxs[0];
        });

        return signedTx;
      } catch (error) {
        captureError(error, {
          operation: 'sign_transaction',
          component: 'WalletContext',
          walletAddress: publicKey?.toBase58(),
        });
        throw error;
      }
    },
    [connected, authToken, publicKey]
  );

  const signAllTransactions = useCallback(
    async (transactions: (Transaction | VersionedTransaction)[]) => {
      if (!connected) {
        throw new Error('Wallet not connected');
      }

      try {
        addBreadcrumb('Signing multiple transactions', 'wallet', {
          transactionCount: transactions.length,
        });

        const signedTxs = await transact(async (wallet: Web3MobileWallet) => {
          await wallet.authorize({
            chain: `solana:${CLUSTER}`,
            identity: APP_IDENTITY,
            auth_token: authToken || undefined,
          });

          return wallet.signTransactions({
            transactions,
          });
        });

        addBreadcrumb('Multiple transactions signed', 'wallet', {
          transactionCount: signedTxs.length,
        });

        return signedTxs;
      } catch (error) {
        captureError(error, {
          operation: 'sign_all_transactions',
          component: 'WalletContext',
          walletAddress: publicKey?.toBase58(),
          extra: { transactionCount: transactions.length },
        });
        throw error;
      }
    },
    [connected, authToken, publicKey]
  );

  const signAndSendTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction): Promise<string> => {
      if (!connected) {
        throw new Error('Wallet not connected');
      }

      try {
        addBreadcrumb('Signing and sending transaction', 'wallet');
        const signature = await transact(async (wallet: Web3MobileWallet) => {
          await wallet.authorize({
            chain: `solana:${CLUSTER}`,
            identity: APP_IDENTITY,
            auth_token: authToken || undefined,
          });

          const signatures = await wallet.signAndSendTransactions({
            transactions: [transaction],
          });
          return signatures[0];
        });

        addBreadcrumb('Transaction sent successfully', 'wallet', { signature });
        return signature;
      } catch (error) {
        captureError(error, {
          operation: 'sign_and_send_transaction',
          component: 'WalletContext',
          walletAddress: publicKey?.toBase58(),
        });
        throw error;
      }
    },
    [connected, authToken, publicKey]
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!connected || !publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        addBreadcrumb('Signing message', 'wallet', {
          messageLength: message.length,
        });

        const signedMessage = await transact(async (wallet: Web3MobileWallet) => {
          const authResult = await wallet.authorize({
            chain: `solana:${CLUSTER}`,
            identity: APP_IDENTITY,
            auth_token: authToken || undefined,
          });

          const result = await wallet.signMessages({
            addresses: [authResult.accounts[0].address],
            payloads: [message],
          });

          return result[0];
        });

        addBreadcrumb('Message signed successfully', 'wallet');
        return signedMessage;
      } catch (error) {
        captureError(error, {
          operation: 'sign_message',
          component: 'WalletContext',
          walletAddress: publicKey?.toBase58(),
        });
        throw error;
      }
    },
    [connected, publicKey, authToken]
  );

  const value: WalletContextState = {
    connected,
    connecting,
    publicKey,
    walletAddress,
    connection,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    signAndSendTransaction,
    signMessage,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
