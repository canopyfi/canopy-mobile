/**
 * Matrica OAuth Client for React Native
 *
 * Handles OAuth flow with Matrica identity provider using expo-auth-session.
 * Supports PKCE (Proof Key for Code Exchange) for secure mobile OAuth.
 */

import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import { logger } from './logger';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'matrica_access_token',
  REFRESH_TOKEN: 'matrica_refresh_token',
  EXPIRES_AT: 'matrica_expires_at',
  USER_ID: 'matrica_user_id',
};

export interface MatricaProfile {
  id: string;
  username?: string;
  avatar?: string;
  wallets: Array<{ address: string; isPrimary: boolean }>;
}

export interface MatricaConfig {
  clientId: string;
  redirectUri: string;
}

// Matrica OAuth discovery document
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://matrica.io/oauth2',
  tokenEndpoint: 'https://api.matrica.io/oauth2/token',
};

export class MatricaAuthClient {
  private config: MatricaConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  constructor(config: MatricaConfig) {
    this.config = config;
  }

  /**
   * Load stored tokens on app startup
   */
  async loadStoredAuth(): Promise<boolean> {
    try {
      const [accessToken, refreshToken, expiresAt] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.EXPIRES_AT),
      ]);

      if (accessToken && refreshToken && expiresAt) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = parseInt(expiresAt, 10);

        // Check if token is expired
        if (Date.now() >= this.expiresAt) {
          return await this.refreshAccessToken();
        }

        return true;
      }
    } catch {
      // Ignore storage errors
    }
    return false;
  }

  /**
   * Create an auth request for use with useAuthRequest hook
   */
  createAuthRequest(): AuthSession.AuthRequest {
    return new AuthSession.AuthRequest({
      clientId: this.config.clientId,
      scopes: ['profile', 'email', 'wallets'],
      redirectUri: this.config.redirectUri,
      usePKCE: true,
    });
  }

  /**
   * Get the discovery document
   */
  getDiscovery(): AuthSession.DiscoveryDocument {
    return discovery;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('[Matrica] Exchanging code for tokens...');

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const response = await fetch(discovery.tokenEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.debug('[Matrica] Token exchange failed:', errorData);
        return { success: false, error: errorData.error_description || 'Token exchange failed' };
      }

      const tokens = await response.json();
      logger.debug('[Matrica] Token exchange successful');
      await this.storeTokens(tokens);

      return { success: true };
    } catch (error) {
      logger.debug('[Matrica] Token exchange error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async storeTokens(tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): Promise<void> {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.expiresAt = Date.now() + tokens.expires_in * 1000;

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, this.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken),
      SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, this.expiresAt.toString()),
    ]);
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const response = await fetch(discovery.tokenEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.config.clientId,
        }).toString(),
      });

      if (!response.ok) {
        await this.logout();
        return false;
      }

      const tokens = await response.json();
      await this.storeTokens(tokens);
      return true;
    } catch {
      await this.logout();
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    // Check if token needs refresh (5 minute buffer)
    if (this.expiresAt && Date.now() >= this.expiresAt - 5 * 60 * 1000) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return null;
      }
    }

    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async logout(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;

    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.EXPIRES_AT),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID),
    ]);
  }

  async getProfile(): Promise<MatricaProfile | null> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      // Fetch wallets first
      const walletsResponse = await fetch('https://api.matrica.io/oauth2/v2/user/wallets', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Canopy-Mobile/1.0',
        },
      });

      let wallets: Array<{ address: string; isPrimary: boolean }> = [];
      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json();
        if (walletsData.wallets && Array.isArray(walletsData.wallets)) {
          wallets = walletsData.wallets.map((w: { id: string }, index: number) => ({
            address: w.id,
            isPrimary: index === 0,
          }));
        }
      }

      // Fetch profile
      const profileResponse = await fetch('https://api.matrica.io/oauth2/v2/user/profile', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Canopy-Mobile/1.0',
        },
      });

      if (!profileResponse.ok) {
        return null;
      }

      const profileData = await profileResponse.json();
      const profile = profileData.profile || profileData;

      return {
        id: profile.id || profile.userId || '',
        username: profile.username || profile.name,
        avatar: profile.avatar || profile.picture,
        wallets,
      };
    } catch {
      return null;
    }
  }
}
