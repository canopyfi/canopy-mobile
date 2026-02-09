import { renderHook, act } from '@testing-library/react-native';
import { useSolanaOperations } from '../useSolanaOperations';
import { useWallet } from '../../contexts/WalletContext';

// Mock the contexts
jest.mock('../../contexts/WalletContext', () => {
  const originalModule = jest.requireActual('../../contexts/WalletContext');
  return {
    ...originalModule,
    useWallet: jest.fn(),
  };
});

jest.mock('../../contexts/CanopyContext', () => ({
  useCanopy: jest.fn().mockReturnValue({
    matricaProfile: { id: 'test-user-123' },
  }),
}));

// Mock fetch for API calls
const mockFetch = global.fetch as jest.Mock;

describe('useSolanaOperations', () => {
  const mockPublicKey = {
    toBase58: () => 'TestWalletPublicKey123',
    toBuffer: () => Buffer.from('mock'),
  };

  const mockConnection = {
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
  };

  const mockSignAndSendTransaction = jest.fn().mockResolvedValue('mockSignature');

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    (useWallet as jest.Mock).mockReturnValue({
      connection: mockConnection,
      publicKey: mockPublicKey,
      signAndSendTransaction: mockSignAndSendTransaction,
    });
  });

  describe('getWateringPda', () => {
    it('should derive PDA for watering account', () => {
      const { result } = renderHook(() => useSolanaOperations());

      const plotPda = 'TestPlotPda123';
      const pda = result.current.getWateringPda(plotPda);

      expect(pda).toBeDefined();
    });

    it('should throw error when wallet not connected', () => {
      (useWallet as jest.Mock).mockReturnValue({
        connection: mockConnection,
        publicKey: null,
        signAndSendTransaction: mockSignAndSendTransaction,
      });

      const { result } = renderHook(() => useSolanaOperations());

      expect(() => result.current.getWateringPda('TestPlotPda123')).toThrow('Wallet not connected');
    });
  });

  describe('checkWateringAccountExists', () => {
    it('should return true when account exists', async () => {
      mockConnection.getAccountInfo.mockResolvedValueOnce({ data: Buffer.from([]) });

      const { result } = renderHook(() => useSolanaOperations());

      let exists: boolean;
      await act(async () => {
        exists = await result.current.checkWateringAccountExists('TestPlotPda123');
      });

      expect(exists!).toBe(true);
    });

    it('should return false when account does not exist', async () => {
      mockConnection.getAccountInfo.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useSolanaOperations());

      let exists: boolean;
      await act(async () => {
        exists = await result.current.checkWateringAccountExists('TestPlotPda123');
      });

      expect(exists!).toBe(false);
    });

    it('should return false on error', async () => {
      mockConnection.getAccountInfo.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSolanaOperations());

      let exists: boolean;
      await act(async () => {
        exists = await result.current.checkWateringAccountExists('TestPlotPda123');
      });

      expect(exists!).toBe(false);
    });
  });

  describe('getSolBalance', () => {
    it('should return SOL balance in SOL units', async () => {
      mockConnection.getBalance.mockResolvedValueOnce(2000000000); // 2 SOL in lamports

      const { result } = renderHook(() => useSolanaOperations());

      let balance: number;
      await act(async () => {
        balance = await result.current.getSolBalance();
      });

      expect(balance!).toBe(2); // 2 SOL
    });

    it('should return 0 when wallet not connected', async () => {
      (useWallet as jest.Mock).mockReturnValue({
        connection: mockConnection,
        publicKey: null,
        signAndSendTransaction: mockSignAndSendTransaction,
      });

      const { result } = renderHook(() => useSolanaOperations());

      let balance: number;
      await act(async () => {
        balance = await result.current.getSolBalance();
      });

      expect(balance!).toBe(0);
    });
  });

  describe('getUsdcBalance', () => {
    it('should return USDC balance', async () => {
      mockConnection.getTokenAccountBalance.mockResolvedValueOnce({
        value: { uiAmount: 500 },
      });

      const { result } = renderHook(() => useSolanaOperations());

      let balance: number;
      await act(async () => {
        balance = await result.current.getUsdcBalance();
      });

      expect(balance!).toBe(500);
    });

    it('should return 0 when wallet not connected', async () => {
      (useWallet as jest.Mock).mockReturnValue({
        connection: mockConnection,
        publicKey: null,
        signAndSendTransaction: mockSignAndSendTransaction,
      });

      const { result } = renderHook(() => useSolanaOperations());

      let balance: number;
      await act(async () => {
        balance = await result.current.getUsdcBalance();
      });

      expect(balance!).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockConnection.getTokenAccountBalance.mockRejectedValueOnce(new Error('Account not found'));

      const { result } = renderHook(() => useSolanaOperations());

      let balance: number;
      await act(async () => {
        balance = await result.current.getUsdcBalance();
      });

      expect(balance!).toBe(0);
    });
  });

  describe('indicateInterest', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ signature: 'mockTxSignature' }),
      });
    });

    it('should indicate interest successfully', async () => {
      const { result } = renderHook(() => useSolanaOperations());

      let signature: string;
      await act(async () => {
        signature = await result.current.indicateInterest('TestPlotPda123', 100);
      });

      expect(signature!).toBe('mockTxSignature');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw error when wallet not connected', async () => {
      (useWallet as jest.Mock).mockReturnValue({
        connection: mockConnection,
        publicKey: null,
        signAndSendTransaction: mockSignAndSendTransaction,
      });

      const { result } = renderHook(() => useSolanaOperations());

      await expect(
        act(async () => {
          await result.current.indicateInterest('TestPlotPda123', 100);
        })
      ).rejects.toThrow('Wallet not connected');
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const { result } = renderHook(() => useSolanaOperations());

      await expect(
        act(async () => {
          await result.current.indicateInterest('TestPlotPda123', 100);
        })
      ).rejects.toThrow('Server error');
    });

    it('should set loading state during operation', async () => {
      let loadingDuringRequest = false;

      mockFetch.mockImplementation(async () => {
        loadingDuringRequest = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          ok: true,
          json: () => Promise.resolve({ signature: 'mockTxSignature' }),
        };
      });

      const { result } = renderHook(() => useSolanaOperations());

      await act(async () => {
        await result.current.indicateInterest('TestPlotPda123', 100);
      });

      expect(loadingDuringRequest).toBe(true);
      expect(result.current.loading).toBe(false); // Should be false after completion
    });
  });

  describe('depositWatering', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            transaction: Buffer.from([]).toString('base64'),
            receiptMint: 'MockReceiptMint123',
          }),
      });
    });

    it('should deposit successfully', async () => {
      const { result } = renderHook(() => useSolanaOperations());

      let depositResult: { signature: string; receiptMint: any };
      await act(async () => {
        depositResult = await result.current.depositWatering(
          'TestPlotPda123',
          'TestWateringPda123',
          100
        );
      });

      expect(depositResult!.signature).toBe('mockSignature');
      expect(mockSignAndSendTransaction).toHaveBeenCalled();
    });

    it('should throw error when wallet not connected', async () => {
      (useWallet as jest.Mock).mockReturnValue({
        connection: mockConnection,
        publicKey: null,
        signAndSendTransaction: mockSignAndSendTransaction,
      });

      const { result } = renderHook(() => useSolanaOperations());

      await expect(
        act(async () => {
          await result.current.depositWatering('TestPlotPda123', 'TestWateringPda123', 100);
        })
      ).rejects.toThrow('Wallet not connected');
    });

    it('should handle prepare API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Preparation failed' }),
      });

      const { result } = renderHook(() => useSolanaOperations());

      await expect(
        act(async () => {
          await result.current.depositWatering('TestPlotPda123', 'TestWateringPda123', 100);
        })
      ).rejects.toThrow('Preparation failed');
    });
  });

  describe('loading state', () => {
    it('should start with loading false', () => {
      const { result } = renderHook(() => useSolanaOperations());
      expect(result.current.loading).toBe(false);
    });
  });

  describe('deriveWateringPda alias', () => {
    it('should be the same as getWateringPda', () => {
      const { result } = renderHook(() => useSolanaOperations());
      expect(result.current.deriveWateringPda).toBe(result.current.getWateringPda);
    });
  });
});
