import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, fontSize, fontFamily, formatUSDC } from '../lib/theme';
import { useWallet } from '../contexts/WalletContext';
import { useCanopy } from '../contexts/CanopyContext';
import { useSolanaOperations } from '../hooks/useSolanaOperations';
import { Plot, RootStackParamList } from '../types';
import { addBreadcrumb, captureError, captureMessage } from '../lib/sentry';
import { logger } from '../lib/logger';

type RouteType = RouteProp<RootStackParamList, 'Invest'>;

function calculateFees(plot: Plot | null, amount: number) {
  const platformFeePct = (plot?.platform_fee_bps || 0) / 100;
  const groveFeePct = (plot?.grove_fee_bps || 0) / 100;
  const platformFeeAmount = (amount * platformFeePct) / 100;
  const groveFeeAmount = (amount * groveFeePct) / 100;
  const totalToBePaid = amount + platformFeeAmount + groveFeeAmount;
  return { platformFeePct, groveFeePct, platformFeeAmount, groveFeeAmount, totalToBePaid };
}

/**
 * Map raw MWA / Solana errors to user-friendly messages.
 */
function getFriendlyError(error: unknown): { title: string; message: string } {
  const raw = error instanceof Error ? error.message : String(error);

  // MWA connection errors
  if (raw.includes('current activity') || raw.includes('Could not find')) {
    return {
      title: 'Wallet App Not Found',
      message: 'Please install a Solana wallet app (like Phantom or Solflare) and try again.',
    };
  }
  if (raw.includes('cancelled') || raw.includes('canceled') || raw.includes('CancellationException')) {
    return { title: 'Cancelled', message: 'You cancelled the wallet request.' };
  }
  if (raw.includes('rejected') || raw.includes('denied') || raw.includes('NOT_SIGNED')) {
    return { title: 'Rejected', message: 'The transaction was rejected in your wallet.' };
  }
  if (raw.includes('timeout') || raw.includes('timed out')) {
    return { title: 'Timed Out', message: 'The wallet request timed out. Please try again.' };
  }
  if (raw.includes('not installed') || raw.includes('no wallet')) {
    return {
      title: 'No Wallet Found',
      message: 'Please install a Solana wallet app to continue.',
    };
  }

  // Transaction / on-chain errors
  if (raw.includes('already-exists') || raw.includes('already been processed')) {
    return {
      title: 'Already Registered',
      message: 'You have already indicated interest in this opportunity.',
    };
  }
  if (raw.includes('Wallet mismatch')) {
    return {
      title: 'Wrong Wallet',
      message: 'This investment is linked to a different wallet. Please switch wallets and try again.',
    };
  }
  if (raw.includes('insufficient') || raw.includes('not enough')) {
    return {
      title: 'Insufficient Funds',
      message: 'You don\'t have enough funds to complete this transaction.',
    };
  }
  if (raw.includes('AccountNotInitialized') && raw.includes('user_token_account')) {
    return {
      title: 'No Token Account',
      message: 'You need USDC in your wallet before you can invest.',
    };
  }
  if (raw.includes('User profile not loaded')) {
    return {
      title: 'Not Signed In',
      message: 'Please sign in with Matrica before investing.',
    };
  }
  if (raw.includes('Wallet not connected')) {
    return {
      title: 'Wallet Disconnected',
      message: 'Your wallet was disconnected. Please reconnect and try again.',
    };
  }
  if (raw.includes('Network request failed') || raw.includes('fetch')) {
    return {
      title: 'Network Error',
      message: 'Could not reach the Solana network. Check your connection and try again.',
    };
  }
  if (raw.includes('confirmation timed out') && raw.includes('may have succeeded')) {
    return {
      title: 'Confirmation Pending',
      message: 'The transaction was sent but we couldn\'t confirm it in time. Check your wallet — it may have succeeded. Pull to refresh to check.',
    };
  }
  if (raw.includes('blockhash') || raw.includes('expired')) {
    return {
      title: 'Transaction Expired',
      message: 'The transaction took too long. Please try again.',
    };
  }

  // Fallback
  return { title: 'Something Went Wrong', message: raw };
}

export default function InvestScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { pda, title } = route.params;

  // Use wallet context for Solana transaction signing
  const { walletAddress, connected, connecting, connect } = useWallet();
  const { getPlotByPda, investments, refreshInvestments } = useCanopy();
  const { indicateInterest, depositWatering } = useSolanaOperations();

  const [plot, setPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [amount, setAmount] = useState('');
  // Initialize step based on current connection status
  const [step, setStep] = useState<'wallet' | 'amount' | 'confirm' | 'processing' | 'success'>(
    connected ? 'amount' : 'wallet'
  );

  // Track if we're returning from wallet app
  const appState = useRef(AppState.currentState);
  const pendingConnection = useRef(false);

  const isCollecting = plot?.status === 'Collecting';

  useEffect(() => {
    fetchPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda]);

  // Listen for app state changes (returning from wallet app)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App came back to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Check if wallet is now connected after returning from wallet app
        if (pendingConnection.current && connected) {
          setStep(isCollecting ? 'confirm' : 'amount');
          pendingConnection.current = false;
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connected, isCollecting]);

  // Also use focus effect to check connection when screen regains focus
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus, check if wallet is connected
      if (connected && step === 'wallet') {
        setStep(isCollecting ? 'confirm' : 'amount');
      }
    }, [connected, step, isCollecting])
  );

  // If wallet becomes connected, move to next step
  useEffect(() => {
    logger.debug('[InvestScreen] useEffect: connected=', connected, 'step=', step);
    if (connected && step === 'wallet') {
      logger.debug('[InvestScreen] Moving to', isCollecting ? 'confirm' : 'amount', 'step');
      setStep(isCollecting ? 'confirm' : 'amount');
    }
  }, [connected, step, isCollecting]);

  const fetchPlot = async () => {
    try {
      const data = await getPlotByPda(pda);
      setPlot(data);

      // Track investment flow started
      addBreadcrumb('Investment flow started', 'investment', {
        plotPda: pda,
        plotTitle: data?.title || data?.name,
        plotStatus: data?.status,
        walletConnected: connected,
      });

      // For Collecting plots, pre-fill the user's allocated amount (convert from raw USDC to dollars)
      if (data?.status === 'Collecting') {
        const plotPda = data.plot_pda || data.pda;
        const existing = investments.find(
          (inv) => inv.plot_pda === plotPda && (inv.status === 'Allocated' || inv.status === 'Interested')
        );
        if (existing) {
          const rawAmount = parseFloat(existing.allotment || existing.requested_allotment || '0');
          setAmount((rawAmount / 1_000_000).toString());
        }
        // Skip amount entry, go straight to confirm (or wallet if not connected)
        if (connected) {
          setStep('confirm');
        }
      } else if (connected) {
        setStep('amount');
      }
    } catch (error) {
      captureError(error, {
        operation: 'fetch_plot_for_invest',
        component: 'InvestScreen',
        extra: { pda },
      });
      Alert.alert('Error', 'Failed to load opportunity details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimals
    const filtered = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimals
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    setAmount(filtered);
  };

  const handleConnectWallet = async () => {
    logger.debug('[InvestScreen] handleConnectWallet called');
    try {
      // Mark that we're expecting a connection when returning from wallet
      pendingConnection.current = true;
      logger.debug('[InvestScreen] Calling connect()...');
      await connect();
      logger.debug('[InvestScreen] connect() returned, connected:', connected);
      // If we get here synchronously (unlikely with MWA), move to next step
      if (connected) {
        logger.debug('[InvestScreen] Already connected, moving to amount step');
        setStep('amount');
      }
    } catch (error) {
      logger.error('[InvestScreen] Connect error:', error);
      pendingConnection.current = false;
      const friendly = getFriendlyError(error);
      Alert.alert(friendly.title, friendly.message);
    }
  };

  const validateAmount = (): boolean => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid investment amount');
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateAmount()) return;

    addBreadcrumb('Investment amount entered', 'investment', {
      amount: parseFloat(amount),
      plotPda: pda,
      plotTitle: plot?.title || plot?.name,
    });

    setStep('confirm');
  };

  const handleInvest = async () => {
    if (!connected || !walletAddress || !plot) {
      addBreadcrumb('Investment blocked - wallet not connected', 'investment', {}, 'warning');
      Alert.alert('Wallet Required', 'Please connect your Solana wallet to sign transactions.', [
        { text: 'OK' },
      ]);
      return;
    }

    const investmentStartTime = Date.now();
    const isInterestGathering = plot.status === 'InterestGathering';
    const plotPda = plot.plot_pda || plot.pda;
    const amountValue = parseFloat(amount);

    addBreadcrumb('Investment confirmed - starting transaction', 'investment', {
      plotPda,
      plotTitle: plot.title || plot.name,
      amount: amountValue,
      isInterestGathering,
      walletAddress,
    });

    setStep('processing');
    setOperationLoading(true);

    try {
      if (isInterestGathering) {
        addBreadcrumb('Indicating interest', 'investment');
        const result = await indicateInterest(plotPda, amountValue);
        if (result === 'already-exists') {
          setStep('confirm');
          setOperationLoading(false);
          Alert.alert(
            'Already Registered',
            'You have already indicated interest in this opportunity.'
          );
          return;
        }
      } else {
        addBreadcrumb('Making deposit', 'investment');
        await depositWatering(plotPda);
      }

      const duration = Date.now() - investmentStartTime;

      addBreadcrumb('Investment successful', 'investment', {
        durationMs: duration,
      });

      // Send analytics event for successful investment
      captureMessage('Investment completed', 'info', {
        plotPda,
        plotTitle: plot.title || plot.name,
        amount: amountValue,
        isInterestGathering,
        walletAddress,
        durationMs: duration,
      });

      // Refresh investments so OpportunityDetailsScreen sees the updated status
      refreshInvestments();

      setStep('success');
    } catch (error) {
      const duration = Date.now() - investmentStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      addBreadcrumb(
        'Investment failed',
        'investment',
        {
          error: errorMessage,
          durationMs: duration,
        },
        'error'
      );

      captureError(error, {
        operation: isInterestGathering ? 'indicate_interest' : 'deposit_watering',
        component: 'InvestScreen',
        walletAddress,
        extra: {
          plotPda,
          plotTitle: plot.title || plot.name,
          amount: amountValue,
          isInterestGathering,
          durationMs: duration,
        },
      });

      setStep('confirm');
      const friendly = getFriendlyError(error);
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'wallet' && (
            <WalletStep plot={plot} onConnect={handleConnectWallet} connecting={connecting} />
          )}

          {step === 'amount' && !isCollecting && (
            <AmountStep
              plot={plot}
              amount={amount}
              onAmountChange={handleAmountChange}
              onContinue={handleContinue}
              walletAddress={walletAddress}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              plot={plot}
              amount={amount}
              onBack={isCollecting ? undefined : () => setStep('amount')}
              onConfirm={handleInvest}
              loading={operationLoading}
            />
          )}

          {step === 'processing' && <ProcessingStep />}

          {step === 'success' && (
            <SuccessStep amount={amount} title={title} onDone={() => navigation.goBack()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WalletStep({
  plot,
  onConnect,
  connecting,
}: {
  plot: Plot | null;
  onConnect: () => void;
  connecting: boolean;
}) {
  const isInterestGathering = plot?.status === 'InterestGathering';

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.walletIconContainer}>
          <Ionicons name="wallet-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.stepTitle}>Connect Your Wallet</Text>
        <Text style={styles.stepSubtitle}>
          {isInterestGathering
            ? 'Connect your Solana wallet to indicate interest'
            : 'Connect your Solana wallet to make a deposit'}
        </Text>
      </View>

      <View style={styles.walletInfoCard}>
        <View style={styles.walletInfoRow}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          <View style={styles.walletInfoTextContainer}>
            <Text style={styles.walletInfoTitle}>Secure Connection</Text>
            <Text style={styles.walletInfoText}>
              Your wallet will be used to sign transactions. We never have access to your private
              keys.
            </Text>
          </View>
        </View>
        <View style={styles.walletInfoRow}>
          <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
          <View style={styles.walletInfoTextContainer}>
            <Text style={styles.walletInfoTitle}>Mobile Wallet Adapter</Text>
            <Text style={styles.walletInfoText}>
              Works with Phantom, Solflare, and other Solana mobile wallets.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
        onPress={onConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color={colors.background} size="small" />
        ) : (
          <>
            <Ionicons name="wallet" size={20} color={colors.background} />
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function AmountStep({
  plot,
  amount,
  onAmountChange,
  onContinue,
  walletAddress,
}: {
  plot: Plot | null;
  amount: string;
  onAmountChange: (text: string) => void;
  onContinue: () => void;
  walletAddress: string | null;
}) {
  const minInvestmentRaw = parseFloat(plot?.minimum_investment || '0');
  const isInterestGathering = plot?.status === 'InterestGathering';

  return (
    <View style={styles.stepContainer}>
      {walletAddress && (
        <View style={styles.connectedWalletBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.connectedWalletText}>
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </Text>
        </View>
      )}

      <View style={styles.stepHeader}>
        <Ionicons name="cash-outline" size={48} color={colors.primary} />
        <Text style={styles.stepTitle}>
          {isInterestGathering ? 'Indicate Interest' : 'Investment Amount'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isInterestGathering
            ? 'Enter the amount you would like to invest'
            : 'Enter the amount you want to deposit'}
        </Text>
      </View>

      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
      </View>

      <Text style={styles.minimumText}>
        Group target: ${formatUSDC(minInvestmentRaw)}
      </Text>

      <View style={styles.quickAmounts}>
        {[100, 500, 1000, 5000].map((value) => (
          <TouchableOpacity
            key={value}
            style={styles.quickAmountButton}
            onPress={() => onAmountChange(value.toString())}
          >
            <Text style={styles.quickAmountText}>${value.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FeeBreakdown plot={plot} amount={parseFloat(amount) || 0} />

      <TouchableOpacity
        style={[styles.continueButton, !amount && styles.continueButtonDisabled]}
        onPress={onContinue}
        disabled={!amount}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfirmStep({
  plot,
  amount,
  onBack,
  onConfirm,
  loading,
}: {
  plot: Plot | null;
  amount: string;
  onBack?: (() => void) | undefined;
  onConfirm: () => void;
  loading: boolean;
}) {
  const isInterestGathering = plot?.status === 'InterestGathering';
  const isCollectingStatus = plot?.status === 'Collecting';
  const amountValue = parseFloat(amount);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons
          name={isCollectingStatus ? 'arrow-down-circle-outline' : 'checkmark-circle-outline'}
          size={48}
          color={colors.primary}
        />
        <Text style={styles.stepTitle}>
          {isCollectingStatus ? 'Deposit Investment' : 'Confirm Investment'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isCollectingStatus
            ? 'Deposit your allocated amount to complete your investment'
            : 'Please review your investment details'}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <SummaryRow label="Opportunity" value={plot?.title || plot?.name || ''} />
        <SummaryRow
          label="Type"
          value={isInterestGathering ? 'Interest Indication' : 'Investment Deposit'}
        />
      </View>

      <FeeBreakdown plot={plot} amount={amountValue} />

      {isInterestGathering && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            This is an interest indication. You will be notified when you can deposit your
            investment.
          </Text>
        </View>
      )}

      {isCollectingStatus && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Your allocation has been confirmed. Tap Deposit to transfer USDC and complete your
            investment.
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.confirmButtonDisabled, !onBack && { flex: 1 }]}
          onPress={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {isCollectingStatus ? 'Deposit' : 'Confirm'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDollars(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function FeeBreakdown({ plot, amount }: { plot: Plot | null; amount: number }) {
  const { platformFeePct, groveFeePct, platformFeeAmount, groveFeeAmount, totalToBePaid } =
    calculateFees(plot, amount);

  if (amount <= 0) return null;

  return (
    <View style={styles.feeCard}>
      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Investment amount</Text>
        <Text style={styles.feeValue}>${formatDollars(amount)}</Text>
      </View>
      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Platform fee ({platformFeePct}%)</Text>
        <Text style={styles.feeValue}>${formatDollars(platformFeeAmount)}</Text>
      </View>
      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Grove fee ({groveFeePct}%)</Text>
        <Text style={styles.feeValue}>${formatDollars(groveFeeAmount)}</Text>
      </View>
      <View style={styles.feeDivider} />
      <View style={styles.feeRow}>
        <Text style={styles.feeTotalLabel}>Total to be paid</Text>
        <Text style={styles.feeTotalValue}>${formatDollars(totalToBePaid)}</Text>
      </View>
    </View>
  );
}

function ProcessingStep() {
  return (
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.processingTitle}>Processing Transaction</Text>
      <Text style={styles.processingSubtitle}>Please approve the transaction in your wallet</Text>
    </View>
  );
}

function SuccessStep({
  amount,
  title,
  onDone,
}: {
  amount: string;
  title: string;
  onDone: () => void;
}) {
  return (
    <View style={styles.centeredContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={64} color={colors.primary} />
      </View>
      <Text style={styles.successTitle}>Success!</Text>
      <Text style={styles.successSubtitle}>
        You have invested ${parseFloat(amount).toLocaleString()} in {title}
      </Text>
      <TouchableOpacity style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  // Wallet step styles
  walletIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletInfoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  walletInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  walletInfoTextContainer: {
    flex: 1,
  },
  walletInfoTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  walletInfoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  connectedWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  connectedWalletText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.subheading,
  },
  stepTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginRight: spacing.sm,
  },
  amountInput: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    minWidth: 150,
    textAlign: 'center',
  },
  minimumText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAmountButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: fontFamily.subheading,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  summaryValueHighlight: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    color: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.info,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  processingSubtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.background,
  },
  feeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  feeLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  feeValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  feeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  feeTotalLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  feeTotalValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    color: colors.primary,
  },
});
