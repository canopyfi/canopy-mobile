import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useCanopy } from '../contexts/CanopyContext';
import { useNetwork } from '../contexts/NetworkContext';
import { NetworkType } from '../lib/network-config';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../lib/theme';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { walletAddress, matricaProfile, logout } = useCanopy();
  const { network, setNetwork, availableNetworks, isNetworkSelectionEnabled, getDisplayInfo } =
    useNetwork();
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const handleNetworkSelect = async (selectedNetwork: NetworkType) => {
    if (selectedNetwork !== network) {
      Alert.alert(
        'Switch Network',
        `Switch to ${getDisplayInfo(selectedNetwork).label}? You may need to log in again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            onPress: async () => {
              await setNetwork(selectedNetwork);
              setShowNetworkModal(false);
              // Logout and require re-authentication on new network
              await logout();
            },
          },
        ]
      );
    } else {
      setShowNetworkModal(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            // Handle error silently
          }
        },
      },
    ]);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.walletInfo}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.walletDetails}>
                <Text style={styles.walletLabel}>{matricaProfile?.username || 'Matrica User'}</Text>
                {walletAddress && (
                  <Text style={styles.walletAddress} numberOfLines={1}>
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </Text>
                )}
              </View>
            </View>
            {walletAddress && (
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  // In a real app, copy to clipboard
                  Alert.alert('Copied', 'Wallet address copied to clipboard');
                }}
              >
                <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.card}>
            {isNetworkSelectionEnabled ? (
              <TouchableOpacity onPress={() => setShowNetworkModal(true)}>
                <View style={styles.settingsRow}>
                  <View style={styles.settingsRowLeft}>
                    <View
                      style={[
                        styles.networkIndicator,
                        { backgroundColor: getDisplayInfo(network).color },
                      ]}
                    />
                    <Text style={styles.settingsRowLabel}>Network</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text
                      style={[styles.settingsRowValue, { color: getDisplayInfo(network).color }]}
                    >
                      {getDisplayInfo(network).label}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <SettingsRow icon="globe-outline" label="Network" value="Mainnet" />
            )}
            <SettingsRow
              icon="server-outline"
              label="RPC Endpoint"
              value={network === 'local' ? 'Localhost' : 'Default'}
              isLast
            />
          </View>
          {isNetworkSelectionEnabled && (
            <Text style={styles.networkHint}>Development build - network selection enabled</Text>
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <SettingsRow icon="document-text-outline" label="Terms of Use" showArrow />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink('https://canopy.app/privacy')}>
              <SettingsRow icon="shield-outline" label="Privacy Policy" showArrow isLast />
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingsRow icon="information-circle-outline" label="Version" value="1.0.0" />
            <SettingsRow icon="code-outline" label="Build" value="1" isLast />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.disconnectButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with love on Solana</Text>
          <Text style={styles.footerText}>Tended by Canopy Collective LTD.</Text>
        </View>
      </ScrollView>

      {/* Network Selection Modal */}
      <Modal
        visible={showNetworkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNetworkModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNetworkModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Network</Text>
            {availableNetworks.map((net) => {
              const info = getDisplayInfo(net);
              const isSelected = net === network;
              return (
                <TouchableOpacity
                  key={net}
                  style={[styles.networkOption, isSelected && styles.networkOptionSelected]}
                  onPress={() => handleNetworkSelect(net)}
                >
                  <View style={styles.networkOptionLeft}>
                    <View style={[styles.networkIndicator, { backgroundColor: info.color }]} />
                    <Text
                      style={[
                        styles.networkOptionLabel,
                        isSelected && styles.networkOptionLabelSelected,
                      ]}
                    >
                      {info.label}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={24} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowNetworkModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  showArrow,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  showArrow?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text style={styles.settingsRowLabel}>{label}</Text>
      </View>
      <View style={styles.settingsRowRight}>
        {value && <Text style={styles.settingsRowValue}>{value}</Text>}
        {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.subheading,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    flex: 1,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  walletDetails: {
    flex: 1,
  },
  walletLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  walletAddress: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.text,
  },
  copyButton: {
    padding: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsRowLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.text,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsRowValue: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  disconnectButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.subheading,
    color: colors.error,
  },
  footer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
  networkIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  networkHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  networkOptionSelected: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  networkOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkOptionLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.text,
  },
  networkOptionLabelSelected: {
    fontFamily: fontFamily.subheading,
  },
  modalCancelButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
});
