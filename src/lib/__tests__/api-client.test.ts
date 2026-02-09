import { CanopyApiClient, ApiError, Plot, Investment, InvestmentSummary } from '../api-client';

// Mock the sentry module
jest.mock('../sentry', () => ({
  captureError: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('CanopyApiClient', () => {
  let client: CanopyApiClient;
  const baseUrl = 'https://api.test.com';
  const apiKey = 'test-api-key';

  beforeEach(() => {
    client = new CanopyApiClient(baseUrl, apiKey);
    (global.fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should trim trailing slash from baseUrl', () => {
      const clientWithSlash = new CanopyApiClient('https://api.test.com/', apiKey);
      expect(clientWithSlash.baseUrl).toBe('https://api.test.com');
    });

    it('should store baseUrl without trailing slash', () => {
      expect(client.baseUrl).toBe('https://api.test.com');
    });
  });

  describe('setAccessToken', () => {
    it('should set access token', () => {
      client.setAccessToken('test-token');
      // Token is private, but we can verify by checking headers in a request
    });

    it('should clear access token when null is passed', () => {
      client.setAccessToken('test-token');
      client.setAccessToken(null);
      // Token should be cleared
    });
  });

  describe('get', () => {
    it('should make GET request with correct URL and headers', async () => {
      const mockResponse = { data: { id: 1, name: 'Test Plot' } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          }),
        })
      );
    });

    it('should include authorization header when access token is set', async () => {
      client.setAccessToken('bearer-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await client.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer bearer-token',
          }),
        })
      );
    });

    it('should append query params to URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await client.get('/api/test', { status: 'active', limit: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should filter out null and undefined params', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await client.get('/api/test', { status: 'active', limit: undefined, offset: null });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('status=active');
      expect(fetchCall).not.toContain('limit=');
      expect(fetchCall).not.toContain('offset=');
    });
  });

  describe('post', () => {
    it('should make POST request with JSON body', async () => {
      const mockResponse = { data: { id: 1 } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const body = { name: 'Test', amount: 100 };
      await client.post('/api/test', body);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw ApiError on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid input', code: 'INVALID_INPUT' } }),
      });

      await expect(client.get('/api/test')).rejects.toThrow(ApiError);
    });

    it('should include status code in ApiError', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: { message: 'Not found' } }),
      });

      try {
        await client.get('/api/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle invalid JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.get('/api/test')).rejects.toThrow(ApiError);
    });
  });

  describe('Plot endpoints', () => {
    it('should fetch plots with options', async () => {
      const mockPlots: Plot[] = [
        {
          id: 1,
          pda: 'pda1',
          plot_pda: 'plot_pda1',
          name: 'Test Plot',
          status: 'InterestGathering',
          allocation: '100000',
          minimum_investment: '1000',
          start_date: null,
          end_date: null,
          grove_id: 1,
          growth_cycle_id: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockPlots }),
      });

      const result = await client.getPlots({ status: 'InterestGathering', limit: 10 });

      expect(result).toEqual(mockPlots);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=InterestGathering'),
        expect.any(Object)
      );
    });

    it('should fetch single plot by ID', async () => {
      const mockPlot: Plot = {
        id: 1,
        pda: 'pda1',
        plot_pda: 'plot_pda1',
        name: 'Test Plot',
        status: 'InterestGathering',
        allocation: '100000',
        minimum_investment: '1000',
        start_date: null,
        end_date: null,
        grove_id: 1,
        growth_cycle_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockPlot }),
      });

      const result = await client.getPlot(1);

      expect(result).toEqual(mockPlot);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/plots/1',
        expect.any(Object)
      );
    });

    it('should fetch plot by PDA', async () => {
      const mockPlot: Plot = {
        id: 1,
        pda: 'test-pda',
        plot_pda: 'test-pda',
        name: 'Test Plot',
        status: 'InterestGathering',
        allocation: '100000',
        minimum_investment: '1000',
        start_date: null,
        end_date: null,
        grove_id: 1,
        growth_cycle_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { database: mockPlot, onChain: {} } }),
      });

      const result = await client.getPlotByPda('test-pda');

      expect(result).toEqual(mockPlot);
    });

    it('should return null for plot not found by PDA', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: { message: 'Not found' } }),
      });

      const result = await client.getPlotByPda('nonexistent-pda');

      expect(result).toBeNull();
    });

    it('should fetch active plots', async () => {
      const mockPlots: Plot[] = [];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockPlots }),
      });

      await client.getActivePlots();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=InterestGathering'),
        expect.any(Object)
      );
    });

    it('should fetch plots by collections', async () => {
      const mockPlots: Plot[] = [];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockPlots }),
      });

      const collectionIds = ['col1', 'col2'];
      await client.getPlotsByCollections(collectionIds);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/plots/by-collections',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ matricaCollectionIds: collectionIds }),
        })
      );
    });

    it('should return empty array for empty collections', async () => {
      const result = await client.getPlotsByCollections([]);

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Investment endpoints', () => {
    it('should fetch user investments', async () => {
      const mockInvestments: Investment[] = [
        {
          id: 1,
          user_id: 1,
          plot_id: 1,
          plot_pda: 'plot-pda',
          member_pubkey: 'pubkey',
          requested_allotment: '1000',
          allotment: '1000',
          deposit_amount: '1000',
          status: 'Deposited',
          nft_receipt_mint: null,
          nft_receipt_account: null,
          platform_fees_paid: '10',
          grove_fees_paid: '5',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInvestments }),
      });

      const result = await client.getUserInvestments('user123');

      expect(result).toEqual(mockInvestments);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/investments/user/user123',
        expect.any(Object)
      );
    });

    it('should fetch investment summary', async () => {
      const mockSummary: InvestmentSummary = {
        total_investments: 5,
        unique_plots: 3,
        interested_count: 1,
        allocated_count: 2,
        deposited_count: 2,
        total_requested: '5000',
        total_allocated: '4000',
        total_deposited: '4000',
        total_platform_fees: '40',
        total_grove_fees: '20',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSummary }),
      });

      const result = await client.getInvestmentSummary('user123');

      expect(result).toEqual(mockSummary);
    });

    it('should record interest', async () => {
      const mockInvestment: Investment = {
        id: 1,
        user_id: 1,
        plot_id: 1,
        plot_pda: 'plot-pda',
        member_pubkey: 'wallet123',
        requested_allotment: '1000',
        allotment: '0',
        deposit_amount: '0',
        status: 'Interested',
        nft_receipt_mint: null,
        nft_receipt_account: null,
        platform_fees_paid: '0',
        grove_fees_paid: '0',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInvestment }),
      });

      const result = await client.recordInterest({
        plotId: 1,
        walletAddress: 'wallet123',
        amount: '1000',
        txSignature: 'sig123',
      });

      expect(result).toEqual(mockInvestment);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/investments/indicate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should record deposit', async () => {
      const mockInvestment: Investment = {
        id: 1,
        user_id: 1,
        plot_id: 1,
        plot_pda: 'plot-pda',
        member_pubkey: 'wallet123',
        requested_allotment: '1000',
        allotment: '1000',
        deposit_amount: '1000',
        status: 'Deposited',
        nft_receipt_mint: 'mint123',
        nft_receipt_account: 'account123',
        platform_fees_paid: '10',
        grove_fees_paid: '5',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInvestment }),
      });

      const result = await client.recordDeposit({
        investmentId: 1,
        txSignature: 'sig123',
        receiptMint: 'mint123',
      });

      expect(result).toEqual(mockInvestment);
    });
  });

  describe('User endpoints', () => {
    it('should create or get user', async () => {
      const mockUser = {
        id: 1,
        external_user_id: 'ext123',
        wallet_address: 'wallet123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockUser }),
      });

      const result = await client.getOrCreateUser('wallet123', 'ext123');

      expect(result).toEqual(mockUser);
    });

    it('should get user by wallet', async () => {
      const mockUser = {
        id: 1,
        external_user_id: 'ext123',
        wallet_address: 'wallet123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockUser }),
      });

      const result = await client.getUserByWallet('wallet123');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by wallet', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: { message: 'Not found' } }),
      });

      const result = await client.getUserByWallet('nonexistent');

      expect(result).toBeNull();
    });

    it('should get user collections', async () => {
      const mockCollections = ['col1', 'col2'];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { collectionIds: mockCollections } }),
      });

      const result = await client.getUserCollections('user123');

      expect(result).toEqual(mockCollections);
    });

    it('should return empty array when collections fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({ error: { message: 'Error' } }),
      });

      const result = await client.getUserCollections('user123');

      expect(result).toEqual([]);
    });
  });
});

describe('ApiError', () => {
  it('should create ApiError with all properties', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR', '/api/test', 'POST');

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.endpoint).toBe('/api/test');
    expect(error.method).toBe('POST');
    expect(error.name).toBe('ApiError');
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR', '/api/test', 'POST');
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'ApiError',
      message: 'Test error',
      statusCode: 400,
      code: 'TEST_ERROR',
      endpoint: '/api/test',
      method: 'POST',
    });
  });
});
