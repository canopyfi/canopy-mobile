import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

import { CanopyApiClient, Plot, Investment, InvestmentSummary } from '../lib/api-client';
import { MatricaAuthClient, MatricaProfile } from '../lib/matrica-auth';
import { useNetwork } from './NetworkContext';
import { NetworkType } from '../lib/network-config';
import { captureError, setSentryUser, clearSentryUser, addBreadcrumb } from '../lib/sentry';
import { logger } from '../lib/logger';

// Configuration from environment
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

// Native app scheme for receiving the callback from web redirect
const NATIVE_REDIRECT_URI = 'com.canopy.mobile://auth/callback';

// Storage key for PKCE code verifier (must persist across app backgrounding)
const CODE_VERIFIER_KEY = 'canopy_code_verifier';

// Matrica OAuth discovery
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://matrica.io/oauth2',
  tokenEndpoint: 'https://api.matrica.io/oauth2/token',
};

interface CanopyContextState {
  // API client
  api: CanopyApiClient;

  // Network state
  network: NetworkType;
  rpcUrl: string;
  programId: string;

  // Auth state
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  matricaProfile: MatricaProfile | null;
  walletAddress: string | null;

  // Data state
  plots: Plot[];
  investments: Investment[];
  investmentSummary: InvestmentSummary | null;
  isLoading: boolean;

  // Auth methods
  login: () => void;
  logout: () => Promise<void>;

  // Data methods
  refreshPlots: () => Promise<void>;
  refreshInvestments: () => Promise<void>;
  getPlot: (id: number) => Promise<Plot | null>;
  getPlotByPda: (pda: string) => Promise<Plot | null>;

  // Transaction recording methods
  indicateInterest: (plotId: number, amount: string, txSignature: string) => Promise<Investment>;
  recordDeposit: (
    investmentId: number,
    txSignature: string,
    receiptMint: string
  ) => Promise<Investment>;
}

const CanopyContext = createContext<CanopyContextState | null>(null);

interface CanopyProviderProps {
  children: ReactNode;
}

export function CanopyProvider({ children }: CanopyProviderProps) {
  // Get network config
  const { network, networkConfig, isLoading: isNetworkLoading } = useNetwork();

  // Get settings from network config (all change per network)
  const { apiUrl, matricaClientId, matricaCallbackUrl } = networkConfig;

  logger.debug('[Canopy] Network:', network);
  logger.debug('[Canopy] API URL:', apiUrl);
  logger.debug(
    '[Canopy] Matrica Client ID:',
    matricaClientId ? '***' + matricaClientId.slice(-4) : 'NOT SET'
  );
  logger.debug('[Canopy] Matrica callback URL:', matricaCallbackUrl);
  logger.debug('[Canopy] Native callback URI:', NATIVE_REDIRECT_URI);

  // Initialize API client - recreates when network changes
  const api = useMemo(() => new CanopyApiClient(apiUrl, API_KEY), [apiUrl]);

  // Matrica client - uses network-specific OAuth settings
  // Production uses canopy.trade, devnet/local use canopy.camp
  const matrica = useMemo(
    () =>
      new MatricaAuthClient({
        clientId: matricaClientId,
        redirectUri: matricaCallbackUrl,
      }),
    [matricaClientId, matricaCallbackUrl]
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [matricaProfile, setMatricaProfile] = useState<MatricaProfile | null>(null);

  const [plots, setPlots] = useState<Plot[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentSummary, setInvestmentSummary] = useState<InvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Store code verifier for PKCE flow
  const codeVerifierRef = useRef<string | null>(null);

  // Derive wallet address from Matrica profile
  const walletAddress = useMemo(() => {
    if (!matricaProfile?.wallets?.length) return null;
    const primaryWallet = matricaProfile.wallets.find((w) => w.isPrimary);
    return primaryWallet?.address || matricaProfile.wallets[0]?.address || null;
  }, [matricaProfile]);

  // Handle deep link callback from web redirect
  const handleDeepLink = useCallback(
    async (url: string) => {
      logger.debug('[Canopy] Deep link received:', url);

      // Parse the callback URL
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      const error = parsed.queryParams?.error as string | undefined;

      if (error) {
        logger.error('[Canopy] Auth error from callback:', error);
        captureError(new Error(`Auth callback error: ${error}`), {
          operation: 'auth_callback',
          component: 'CanopyContext',
          extra: { errorCode: error },
        });
        setIsAuthLoading(false);
        return;
      }

      if (!code) {
        logger.debug('[Canopy] No code in deep link, ignoring');
        return;
      }

      // Load code verifier from persistent storage (survives app backgrounding)
      const storedCodeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);

      if (!storedCodeVerifier) {
        logger.error('[Canopy] No code verifier stored in SecureStore');
        captureError(new Error('Missing code verifier in PKCE flow'), {
          operation: 'auth_callback',
          component: 'CanopyContext',
          extra: { hasCode: !!code },
        });
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      try {
        logger.debug('[Canopy] Exchanging code for tokens...');
        const result = await matrica.exchangeCodeForTokens(code, storedCodeVerifier);

        if (result.success) {
          const token = await matrica.getAccessToken();
          api.setAccessToken(token);
          setIsAuthenticated(true);
          const profile = await matrica.getProfile();
          setMatricaProfile(profile);

          // Set Sentry user context
          if (profile) {
            setSentryUser(profile.id.toString(), profile.wallets?.[0]?.address, profile.username);
          }

          addBreadcrumb('User logged in successfully', 'auth', {
            userId: profile?.id,
            hasWallet: !!profile?.wallets?.length,
          });
          logger.debug('[Canopy] Login successful');
        } else {
          logger.error('[Canopy] Token exchange failed:', result.error);
          captureError(new Error(`Token exchange failed: ${result.error}`), {
            operation: 'token_exchange',
            component: 'CanopyContext',
          });
        }
      } catch (error) {
        logger.error('[Canopy] Auth callback error:', error);
        captureError(error, {
          operation: 'auth_callback',
          component: 'CanopyContext',
        });
      } finally {
        // Clear code verifier from storage
        await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
        codeVerifierRef.current = null;
        setIsAuthLoading(false);
      }
    },
    [matrica, api]
  );

  // Listen for deep links
  useEffect(() => {
    // Handle deep link if app was opened via URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        addBreadcrumb('Initializing auth', 'auth');
        const hasAuth = await matrica.loadStoredAuth();
        if (hasAuth) {
          const token = await matrica.getAccessToken();
          api.setAccessToken(token);
          setIsAuthenticated(true);
          const profile = await matrica.getProfile();
          setMatricaProfile(profile);

          // Set Sentry user context on session restore
          if (profile) {
            setSentryUser(profile.id.toString(), profile.wallets?.[0]?.address, profile.username);
          }
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
        captureError(error, {
          operation: 'init_auth',
          component: 'CanopyContext',
        });
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();
  }, [api, matrica]);

  const login = useCallback(async () => {
    logger.debug('[Canopy] Starting login...');
    logger.debug('[Canopy] Network:', network);
    logger.debug('[Canopy] Matrica callback URL:', matricaCallbackUrl);
    setIsAuthLoading(true);

    try {
      // Create auth request with PKCE
      // Uses network-specific Matrica OAuth settings
      const authRequest = new AuthSession.AuthRequest({
        clientId: matricaClientId,
        redirectUri: matricaCallbackUrl,
        scopes: ['profile', 'email', 'wallets'],
        usePKCE: true,
      });

      // Build the authorization URL (this generates the code verifier/challenge)
      const authUrl = await authRequest.makeAuthUrlAsync(discovery);
      codeVerifierRef.current = authRequest.codeVerifier || null;

      // Store code verifier persistently (survives app backgrounding)
      if (authRequest.codeVerifier) {
        await SecureStore.setItemAsync(CODE_VERIFIER_KEY, authRequest.codeVerifier);
      }

      logger.debug('[Canopy] Opening auth URL:', authUrl);
      logger.debug('[Canopy] Code verifier stored in SecureStore:', !!authRequest.codeVerifier);

      // Open browser for authentication
      // The web callback will redirect to our native scheme
      const result = await WebBrowser.openAuthSessionAsync(authUrl, NATIVE_REDIRECT_URI);

      logger.debug('[Canopy] Browser result:', result.type);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.debug('[Canopy] Auth cancelled by user');
        await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
        codeVerifierRef.current = null;
        setIsAuthLoading(false);
      }
      // If successful, the deep link handler will process the callback
    } catch (error) {
      logger.error('[Canopy] Login error:', error);
      captureError(error, {
        operation: 'login',
        component: 'CanopyContext',
        network,
        extra: {
          hasClientId: !!matricaClientId,
          callbackUrl: matricaCallbackUrl,
        },
      });
      await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
      codeVerifierRef.current = null;
      setIsAuthLoading(false);
    }
  }, [network, matricaClientId, matricaCallbackUrl]);

  const logout = useCallback(async () => {
    addBreadcrumb('User logging out', 'auth');
    await matrica.logout();
    api.setAccessToken(null);
    setIsAuthenticated(false);
    setMatricaProfile(null);
    setInvestments([]);
    setInvestmentSummary(null);
    clearSentryUser();
  }, [api, matrica]);

  const refreshPlots = useCallback(async () => {
    const userId = matricaProfile?.id;
    if (!userId) {
      logger.debug('[Canopy] No user ID, cannot fetch plots');
      return;
    }

    setIsLoading(true);
    try {
      // Get user's NFT collection IDs from backend (which calls Matrica API)
      const collectionIds = await api.getUserCollections(userId);
      logger.debug('[Canopy] User collection IDs:', collectionIds);

      if (collectionIds.length === 0) {
        logger.debug('[Canopy] No collections found for user, showing empty plots');
        setPlots([]);
        return;
      }

      // Get plots filtered by user's collections
      const data = await api.getPlotsByCollections(collectionIds);
      logger.debug('[Canopy] Fetched plots by collections:', data.length);
      setPlots(data);
    } catch (error) {
      logger.error('Failed to fetch plots:', error);
      captureError(error, {
        operation: 'refresh_plots',
        component: 'CanopyContext',
        userId: userId?.toString(),
        extra: {
          apiUrl: api.baseUrl,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, matricaProfile?.id]);

  const refreshInvestments = useCallback(async () => {
    const userId = matricaProfile?.id;
    if (!userId) {
      logger.debug('[Canopy] refreshInvestments: No user ID, skipping');
      return;
    }

    logger.debug('[Canopy] refreshInvestments: Fetching for user:', userId);
    logger.debug('[Canopy] refreshInvestments: Using API URL:', apiUrl);

    setIsLoading(true);
    try {
      const [investmentsData, summaryData] = await Promise.all([
        api.getUserInvestments(userId),
        api.getInvestmentSummary(userId),
      ]);
      logger.debug('[Canopy] refreshInvestments: Got', investmentsData.length, 'investments');
      setInvestments(investmentsData);
      setInvestmentSummary(summaryData);
    } catch (error) {
      logger.error('[Canopy] Failed to fetch investments:', error);
      captureError(error, {
        operation: 'refresh_investments',
        component: 'CanopyContext',
        userId: userId?.toString(),
        extra: {
          apiUrl,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, apiUrl, matricaProfile?.id]);

  // Fetch investments when authenticated with Matrica profile
  useEffect(() => {
    if (isAuthenticated && matricaProfile?.id) {
      refreshInvestments();
    }
  }, [isAuthenticated, matricaProfile?.id, refreshInvestments]);

  // Fetch plots when authenticated with profile (plots are filtered by user's NFT collections)
  useEffect(() => {
    if (isAuthenticated && matricaProfile?.id) {
      refreshPlots();
    }
  }, [isAuthenticated, matricaProfile?.id, refreshPlots]);

  const getPlot = useCallback(
    async (id: number): Promise<Plot | null> => {
      try {
        return await api.getPlot(id);
      } catch (error) {
        logger.error('Failed to fetch plot:', error);
        captureError(error, {
          operation: 'get_plot',
          component: 'CanopyContext',
          extra: { plotId: id },
        });
        return null;
      }
    },
    [api]
  );

  const getPlotByPda = useCallback(
    async (pda: string): Promise<Plot | null> => {
      try {
        return await api.getPlotByPda(pda);
      } catch (error) {
        logger.error('Failed to fetch plot by PDA:', error);
        captureError(error, {
          operation: 'get_plot_by_pda',
          component: 'CanopyContext',
          extra: { pda },
        });
        return null;
      }
    },
    [api]
  );

  const indicateInterest = useCallback(
    async (plotId: number, amount: string, txSignature: string): Promise<Investment> => {
      if (!walletAddress) {
        throw new Error('No wallet address available from Matrica profile');
      }

      const investment = await api.recordInterest({
        plotId,
        walletAddress,
        amount,
        txSignature,
      });

      await refreshInvestments();
      return investment;
    },
    [api, walletAddress, refreshInvestments]
  );

  const recordDeposit = useCallback(
    async (investmentId: number, txSignature: string, receiptMint: string): Promise<Investment> => {
      const investment = await api.recordDeposit({
        investmentId,
        txSignature,
        receiptMint,
      });

      await refreshInvestments();
      return investment;
    },
    [api, refreshInvestments]
  );

  const value: CanopyContextState = {
    api,
    network,
    rpcUrl: networkConfig.rpcUrl,
    programId: networkConfig.programId,
    isAuthenticated,
    isAuthLoading: isAuthLoading || isNetworkLoading,
    matricaProfile,
    walletAddress,
    plots,
    investments,
    investmentSummary,
    isLoading,
    login,
    logout,
    refreshPlots,
    refreshInvestments,
    getPlot,
    getPlotByPda,
    indicateInterest,
    recordDeposit,
  };

  return <CanopyContext.Provider value={value}>{children}</CanopyContext.Provider>;
}

export function useCanopy(): CanopyContextState {
  const context = useContext(CanopyContext);
  if (!context) {
    throw new Error('useCanopy must be used within a CanopyProvider');
  }
  return context;
}
