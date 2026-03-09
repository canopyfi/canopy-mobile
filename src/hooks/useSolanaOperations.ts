import { useCallback, useMemo, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallet } from '../contexts/WalletContext';
import { useCanopy } from '../contexts/CanopyContext';
import { useNetwork } from '../contexts/NetworkContext';
import { NETWORK_CONFIGS } from '../lib/network-config';
import { trackWalletTransaction, captureWalletFailure } from '../lib/wallet-telemetry';
import { WateringClient } from '@canopyfi/sdk';
import type { Canopy } from '@canopyfi/sdk';
import idlJson from '../lib/canopy-idl.json';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Confirm a transaction with retries. MWA sends the user to an external wallet
 * app; by the time they sign and return, the blockhash may have expired.
 * We first try the standard confirmTransaction, then fall back to polling
 * getSignatureStatus with retries and back-off.
 */
async function confirmWithRetry(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
  maxRetries = 5,
): Promise<void> {
  // Fast path: standard confirmation (works when MWA round-trip is quick)
  try {
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
    return;
  } catch {
    // Blockhash likely expired — fall through to polling
  }

  // Slow path: poll getSignatureStatus with retries
  for (let i = 0; i < maxRetries; i++) {
    await sleep(2000 * (i + 1)); // 2s, 4s, 6s, 8s, 10s
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status?.value?.confirmationStatus) {
        return; // Transaction landed on-chain
      }
    } catch {
      // Connection may still be reconnecting after app foreground — retry
    }
  }

  throw new Error(
    'Transaction was sent but confirmation timed out. ' +
    'Check your wallet — the transaction may have succeeded.'
  );
}

export function useSolanaOperations() {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const { matricaProfile } = useCanopy();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);

  // Get the program ID from network config
  const programId = useMemo(
    () => new PublicKey(NETWORK_CONFIGS[network].programId),
    [network]
  );

  // Create a read-only Anchor Program instance for building transactions.
  // The dummy wallet is never used for signing — MWA handles all signing.
  const program = useMemo(() => {
    const dummyWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: 'confirmed',
    });
    // Override IDL address with current network's program ID
    const updatedIdl = { ...idlJson, address: programId.toString() };
    return new Program<Canopy>(updatedIdl as any, provider);
  }, [connection, programId]);

  // Create WateringClient from the SDK
  const wateringClient = useMemo(() => {
    const { apiUrl } = NETWORK_CONFIGS[network];
    return new WateringClient(program as any, program.provider as AnchorProvider, {
      apiBaseUrl: apiUrl,
      apiKey: process.env.EXPO_PUBLIC_API_KEY,
    });
  }, [program, network]);

  /**
   * Derive a PDA for a watering account
   */
  const getWateringPda = useCallback(
    (plotPda: string): PublicKey => {
      if (!publicKey) throw new Error('Wallet not connected');
      const [pda] = wateringClient.deriveWateringPda(new PublicKey(plotPda), publicKey);
      return pda;
    },
    [publicKey, wateringClient]
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
   * Ensure user wallet exists in backend database before on-chain transaction.
   * This allows the event listener to map on-chain waterings to the user.
   */
  const ensureUserWallet = useCallback(
    async (externalUserId: string, walletAddress: string): Promise<void> => {
      const { apiUrl } = NETWORK_CONFIGS[network];
      try {
        await fetch(`${apiUrl}/api/users/ensure-wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.EXPO_PUBLIC_API_KEY
              ? { 'X-API-Key': process.env.EXPO_PUBLIC_API_KEY }
              : {}),
          },
          body: JSON.stringify({
            external_user_id: externalUserId,
            wallet_address: walletAddress,
          }),
        });
      } catch {
        // Non-critical — event listener can still link via on-chain external_user_id
      }
    },
    [network]
  );

  /**
   * Indicate interest in an opportunity.
   * Uses SDK's WateringClient to build the transaction, then signs via MWA.
   */
  const indicateInterest = useCallback(
    async (plotPda: string, amount: number): Promise<string> => {
      if (!publicKey) throw new Error('Wallet not connected');
      if (!matricaProfile?.id) throw new Error('User profile not loaded');

      const attrs = {
        plot_pda: plotPda,
        amount,
        wallet: publicKey.toBase58(),
        wallet_type: 'mobile_wallet_adapter',
        network,
      };

      setLoading(true);

      try {
        return await trackWalletTransaction('indicate_interest', attrs, async () => {
          const externalUserId = matricaProfile.id.toString();
          const plot = new PublicKey(plotPda);

          // Ensure user wallet exists in backend for event listener mapping
          await ensureUserWallet(externalUserId, publicKey.toBase58());

          // Check if watering already exists
          const [wateringPda] = wateringClient.deriveWateringPda(plot, publicKey);
          const existingAccount = await connection.getAccountInfo(wateringPda);
          if (existingAccount) {
            return 'already-exists';
          }

          // Build the transaction using SDK builder
          const { transaction } = await wateringClient.buildIndicateInterestTx({
            plotPda: plot,
            requestedAllotment: new BN(Math.floor(amount * 1_000_000)),
            external_user_id: externalUserId,
            authority: publicKey,
          });

          // Set blockhash and fee payer for MWA signing
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;

          // Sign and send via Mobile Wallet Adapter
          const signature = await signAndSendTransaction(transaction);

          // Confirm the transaction with retry fallback for MWA delays
          await confirmWithRetry(connection, signature, blockhash, lastValidBlockHeight);

          return signature;
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        captureWalletFailure('indicate_interest', msg, attrs);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, matricaProfile, network, connection, wateringClient, signAndSendTransaction, ensureUserWallet]
  );

  /**
   * Deposit funds for an allocated investment.
   * Uses SDK's WateringClient to build the deposit transaction with NFT receipt,
   * partially signs with the asset keypair, then sends via MWA.
   */
  const depositWatering = useCallback(
    async (
      plotPda: string,
    ): Promise<{ signature: string; receiptMint: PublicKey }> => {
      if (!publicKey) throw new Error('Wallet not connected');

      const attrs = {
        plot_pda: plotPda,
        wallet: publicKey.toBase58(),
        wallet_type: 'mobile_wallet_adapter',
        network,
      };

      setLoading(true);

      try {
        return await trackWalletTransaction('deposit_watering', attrs, async () => {
          const plot = new PublicKey(plotPda);
          const [wateringPda] = wateringClient.deriveWateringPda(plot, publicKey);

          // Build the transaction using SDK builder
          const result = await wateringClient.buildDepositWateringTx({
            wateringPda,
            plotPda: plot,
            authority: publicKey,
          });

          if (!result.success) {
            throw new Error(result.error);
          }

          const { transaction, assetPubkey, signers } = result;

          // Set blockhash and fee payer
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;

          // Partially sign with additional signers (assetKeypair for NFT receipt)
          for (const signer of signers) {
            transaction.partialSign(signer);
          }

          // Sign and send via MWA (wallet adds its signature)
          const signature = await signAndSendTransaction(transaction);

          // Confirm the transaction. MWA round-trip (app backgrounding, wallet
          // signing, returning) can easily exceed blockhash validity, so we
          // fall back to polling getSignatureStatus with retries.
          await confirmWithRetry(connection, signature, blockhash, lastValidBlockHeight);

          return {
            signature,
            receiptMint: assetPubkey,
          };
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        captureWalletFailure('deposit_watering', msg, attrs);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, signAndSendTransaction, network, wateringClient]
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
      const usdcMint = new PublicKey(NETWORK_CONFIGS[network].usdcMint);
      const tokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdcMint,
        publicKey
      );
      const balance = await connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.uiAmount?.toString() || '0');
    } catch {
      return 0;
    }
  }, [publicKey, connection, network]);

  return {
    loading,
    getWateringPda,
    checkWateringAccountExists,
    indicateInterest,
    depositWatering,
    getSolBalance,
    getUsdcBalance,
    deriveWateringPda: getWateringPda,
  };
}
