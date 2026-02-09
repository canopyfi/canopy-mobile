import {
  NETWORK_CONFIGS,
  getAvailableNetworks,
  getDefaultNetwork,
  isNetworkSelectionEnabled,
  getNetworkConfig,
  getNetworkDisplayInfo,
} from '../network-config';

describe('network-config', () => {
  describe('NETWORK_CONFIGS', () => {
    it('should have mainnet configuration', () => {
      expect(NETWORK_CONFIGS.mainnet).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.name).toBe('Mainnet');
      expect(NETWORK_CONFIGS.mainnet.rpcUrl).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.apiUrl).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.programId).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.usdcMint).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.matricaClientId).toBeDefined();
      expect(NETWORK_CONFIGS.mainnet.matricaCallbackUrl).toBeDefined();
    });

    it('should have devnet configuration', () => {
      expect(NETWORK_CONFIGS.devnet).toBeDefined();
      expect(NETWORK_CONFIGS.devnet.name).toBe('Devnet');
      expect(NETWORK_CONFIGS.devnet.rpcUrl).toBeDefined();
      expect(NETWORK_CONFIGS.devnet.apiUrl).toBeDefined();
    });

    it('should have local configuration', () => {
      expect(NETWORK_CONFIGS.local).toBeDefined();
      expect(NETWORK_CONFIGS.local.name).toBe('Local');
    });

    it('should have different API URLs per network', () => {
      expect(NETWORK_CONFIGS.mainnet.apiUrl).not.toBe(NETWORK_CONFIGS.devnet.apiUrl);
    });

    it('should have correct mainnet USDC mint', () => {
      expect(NETWORK_CONFIGS.mainnet.usdcMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });
  });

  describe('getAvailableNetworks', () => {
    it('should return array of networks in dev mode', () => {
      // __DEV__ is set to true in jest.config.js
      const networks = getAvailableNetworks();
      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0);
    });

    it('should include mainnet', () => {
      const networks = getAvailableNetworks();
      expect(networks).toContain('mainnet');
    });

    it('should include devnet in dev mode', () => {
      const networks = getAvailableNetworks();
      expect(networks).toContain('devnet');
    });

    it('should include local in dev mode', () => {
      const networks = getAvailableNetworks();
      expect(networks).toContain('local');
    });
  });

  describe('getDefaultNetwork', () => {
    it('should return devnet in dev mode', () => {
      // __DEV__ is true in tests
      const defaultNetwork = getDefaultNetwork();
      expect(defaultNetwork).toBe('devnet');
    });
  });

  describe('isNetworkSelectionEnabled', () => {
    it('should return true in dev mode', () => {
      expect(isNetworkSelectionEnabled()).toBe(true);
    });
  });

  describe('getNetworkConfig', () => {
    it('should return correct config for mainnet', () => {
      const config = getNetworkConfig('mainnet');
      expect(config).toBe(NETWORK_CONFIGS.mainnet);
    });

    it('should return correct config for devnet', () => {
      const config = getNetworkConfig('devnet');
      expect(config).toBe(NETWORK_CONFIGS.devnet);
    });

    it('should return correct config for local', () => {
      const config = getNetworkConfig('local');
      expect(config).toBe(NETWORK_CONFIGS.local);
    });
  });

  describe('getNetworkDisplayInfo', () => {
    it('should return correct display info for mainnet', () => {
      const info = getNetworkDisplayInfo('mainnet');
      expect(info.label).toBe('Mainnet');
      expect(info.color).toBe('#10B981');
      expect(info.icon).toBe('globe');
    });

    it('should return correct display info for devnet', () => {
      const info = getNetworkDisplayInfo('devnet');
      expect(info.label).toBe('Devnet');
      expect(info.color).toBe('#F59E0B');
      expect(info.icon).toBe('flask');
    });

    it('should return correct display info for local', () => {
      const info = getNetworkDisplayInfo('local');
      expect(info.label).toBe('Local');
      expect(info.color).toBe('#6366F1');
      expect(info.icon).toBe('laptop');
    });
  });
});
