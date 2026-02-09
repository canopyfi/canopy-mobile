import { useCallback, useState } from 'react';
import { PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallet } from '../contexts/WalletContext';
import { useCanopy } from '../contexts/CanopyContext';

// Default Canopy program ID (matches @canopyfi/sdk devnet)
const DEFAULT_CANOPY_PROGRAM_ID = '6M7Ysuvus47X5M4RQA48L3YPKpLi5vyN5dvvwoiDCGdF';

// Get program ID from environment
const CANOPY_PROGRAM_ID = new PublicKey(
  process.env.EXPO_PUBLIC_CANOPY_PROGRAM_ID || DEFAULT_CANOPY_PROGRAM_ID
);

// Token addresses
const USDC_MINT = new PublicKey(
  process.env.EXPO_PUBLIC_USDC_MINT || '2nEeqsyDdX3jztfxJKKego3x8AZ4xKHG2ZcQZrPkTtMk'
);

// Derive watering PDA
function deriveWateringPdaLocal(
  programId: PublicKey,
  plotPda: PublicKey,
  memberPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('watering'), plotPda.toBuffer(), memberPubkey.toBuffer()],
    programId
  );
}

export function useSolanaOperations() {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const { matricaProfile } = useCanopy();
  const [loading, setLoading] = useState(false);

  /**
   * Derive a PDA for a watering account
   */
  const getWateringPda = useCallback(
    (plotPda: string): PublicKey => {
      if (!publicKey) throw new Error('Wallet not connected');
      const [pda] = deriveWateringPdaLocal(CANOPY_PROGRAM_ID, new PublicKey(plotPda), publicKey);
      return pda;
    },
    [publicKey]
  );

  /**
   * Check if a watering account exists for the user
   */
  const checkWateringAccountExists = useCallback(
    async (plotPda: string): Promise<boolean> => {
      try {
        const wateringPda = getWateringPda(plotPda);
        const accountInfo = await connection.getAccountInfo(wateringPda);
        return accountInfo !== null;
      } catch {
        return false;
      }
    },
    [connection, getWateringPda]
  );

  /**
   * Indicate interest in an opportunity
   * This builds the transaction instruction manually and sends via MWA
   */
  const indicateInterest = useCallback(
    async (plotPda: string, amount: number): Promise<string> => {
      if (!publicKey) throw new Error('Wallet not connected');
      if (!matricaProfile?.id) throw new Error('User profile not loaded');

      setLoading(true);

      try {
        const externalUserId = matricaProfile.id.toString();

        // Use API-based approach for indicating interest
        // Call the backend API to create the interest indication
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.canopy.app';

        const response = await fetch(`${apiBaseUrl}/api/waterings/indicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plot_pda: plotPda,
            wallet_address: publicKey.toBase58(),
            requested_allotment: Math.floor(amount * 1_000_000),
            external_user_id: externalUserId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to indicate interest');
        }

        const result = await response.json();
        return result.signature || 'pending';
      } finally {
        setLoading(false);
      }
    },
    [publicKey, matricaProfile]
  );

  /**
   * Deposit funds for an allocated investment
   * This requires signing with MWA
   */
  const depositWatering = useCallback(
    async (
      plotPda: string,
      _wateringPda: string,
      amount: number
    ): Promise<{ signature: string; receiptMint: PublicKey }> => {
      if (!publicKey) throw new Error('Wallet not connected');

      setLoading(true);

      try {
        // For deposit, we need to call the API to build the transaction
        // then sign it with MWA
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.canopy.app';

        const response = await fetch(`${apiBaseUrl}/api/waterings/deposit/prepare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plot_pda: plotPda,
            wallet_address: publicKey.toBase58(),
            amount: Math.floor(amount * 1_000_000),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to prepare deposit');
        }

        const { transaction: serializedTx, receiptMint: receiptMintString } = await response.json();

        // Deserialize and sign the transaction
        const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));

        // Sign and send via Mobile Wallet Adapter
        const signature = await signAndSendTransaction(transaction);

        // Wait for confirmation
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        return {
          signature,
          receiptMint: new PublicKey(receiptMintString),
        };
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, signAndSendTransaction]
  );

  /**
   * Get the SOL balance of the connected wallet
   */
  const getSolBalance = useCallback(async (): Promise<number> => {
    if (!publicKey) return 0;
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }, [publicKey, connection]);

  /**
   * Get the USDC balance of the connected wallet
   */
  const getUsdcBalance = useCallback(async (): Promise<number> => {
    if (!publicKey) return 0;

    try {
      // Get associated token account address using @solana/spl-token v0.1.8 API
      const tokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        USDC_MINT,
        publicKey
      );
      const balance = await connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.uiAmount?.toString() || '0');
    } catch {
      return 0;
    }
  }, [publicKey, connection]);

  return {
    loading,
    getWateringPda,
    checkWateringAccountExists,
    indicateInterest,
    depositWatering,
    getSolBalance,
    getUsdcBalance,
    // Expose SDK utilities
    deriveWateringPda: getWateringPda,
  };
}
