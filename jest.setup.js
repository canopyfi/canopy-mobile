/* eslint-disable no-undef */
import '@testing-library/react-native/matchers';

// Mock global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests (but keep errors)
const originalConsoleError = console.error;
console.log = jest.fn();
console.warn = jest.fn();
console.error = (...args) => {
  // Only show errors that aren't React Native warnings
  if (args[0]?.includes?.('Warning:')) return;
  originalConsoleError.apply(console, args);
};

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  parse: jest.fn().mockReturnValue({ queryParams: {} }),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  createURL: jest.fn((path) => `canopy://${path}`),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    makeAuthUrlAsync: jest.fn().mockResolvedValue('https://mock-auth-url.com'),
    codeVerifier: 'mock-code-verifier',
  })),
  DiscoveryDocument: {},
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'success' }),
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
  dismissBrowser: jest.fn(),
}));

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => {
  const createMockPublicKey = (input) => ({
    toBase58: () => (typeof input === 'string' ? input : 'mockPublicKey123'),
    toBuffer: () => Buffer.from('mock'),
    toString: () => (typeof input === 'string' ? input : 'mockPublicKey123'),
  });

  const MockPublicKey = jest.fn().mockImplementation((input) => createMockPublicKey(input));

  // Static method for PDA derivation
  MockPublicKey.findProgramAddressSync = jest
    .fn()
    .mockReturnValue([createMockPublicKey('derivedPda123'), 255]);

  const MockTransaction = jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    serialize: jest.fn().mockReturnValue(Buffer.from('mock')),
  }));

  // Static method for deserializing
  MockTransaction.from = jest.fn().mockReturnValue({
    add: jest.fn(),
    serialize: jest.fn().mockReturnValue(Buffer.from('mock')),
  });

  return {
    PublicKey: MockPublicKey,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(1000000000),
      getAccountInfo: jest.fn().mockResolvedValue(null),
      getTokenAccountBalance: jest.fn().mockResolvedValue({
        value: { uiAmount: 100 },
      }),
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'mockBlockhash',
        lastValidBlockHeight: 12345,
      }),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    })),
    clusterApiUrl: jest.fn().mockReturnValue('https://api.devnet.solana.com'),
    Transaction: MockTransaction,
    VersionedTransaction: jest.fn(),
    LAMPORTS_PER_SOL: 1000000000,
  };
});

// Mock @solana/spl-token
jest.mock('@solana/spl-token', () => ({
  Token: {
    getAssociatedTokenAddress: jest.fn().mockResolvedValue({
      toBase58: () => 'mockTokenAccount',
    }),
  },
  TOKEN_PROGRAM_ID: { toBase58: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  ASSOCIATED_TOKEN_PROGRAM_ID: { toBase58: () => 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' },
}));

// Mock @solana-mobile/mobile-wallet-adapter-protocol-web3js
jest.mock('@solana-mobile/mobile-wallet-adapter-protocol-web3js', () => ({
  transact: jest.fn().mockImplementation(async (callback) => {
    const mockWallet = {
      authorize: jest.fn().mockResolvedValue({
        accounts: [{ address: 'mockWalletAddress', label: 'Test Wallet' }],
        auth_token: 'mock-auth-token',
        wallet_uri_base: 'https://mock-wallet.app',
      }),
      deauthorize: jest.fn().mockResolvedValue(undefined),
      signTransactions: jest.fn().mockResolvedValue([{}]),
      signAndSendTransactions: jest.fn().mockResolvedValue(['mockSignature']),
      signMessages: jest.fn().mockResolvedValue([new Uint8Array([1, 2, 3])]),
    };
    return callback(mockWallet);
  }),
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn().mockReturnValue('mock-event-id'),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  startInactiveSpan: jest.fn(),
  reactNavigationIntegration: jest.fn().mockReturnValue({ name: 'ReactNavigation' }),
  httpClientIntegration: jest.fn().mockReturnValue({ name: 'HttpClient' }),
  ErrorBoundary: ({ children }) => children,
  wrap: jest.fn((component) => component),
  Severity: {
    Info: 'info',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock the sentry lib
jest.mock('./src/lib/sentry', () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
  Sentry: {
    init: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
  },
}));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
