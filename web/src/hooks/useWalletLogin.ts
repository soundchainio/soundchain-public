import { useMutation } from '@apollo/client';
import { useCallback, useState } from 'react';
import Cookies from 'js-cookie';
import { LOGIN_WITH_WALLET_MUTATION } from '../lib/graphql/mutations';

interface LoginWithWalletInput {
  walletAddress: string;
  signature: string;
  message: string;
  handle?: string;
  displayName?: string;
}

interface UseWalletLoginReturn {
  loginWithWallet: (input: LoginWithWalletInput) => Promise<string | null>;
  signAndLogin: (walletAddress: string, signMessage: (message: string) => Promise<string>) => Promise<string | null>;
  loading: boolean;
  error: Error | null;
}

// Generate the message to sign for wallet authentication
export const generateLoginMessage = (walletAddress: string): string => {
  const timestamp = Date.now();
  return `Sign this message to authenticate with SoundChain.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis signature does not trigger any blockchain transaction or cost any gas.`;
};

export const useWalletLogin = (): UseWalletLoginReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [loginMutation] = useMutation(LOGIN_WITH_WALLET_MUTATION);

  // Direct login with pre-signed message
  const loginWithWallet = useCallback(async (input: LoginWithWalletInput): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔑 Logging in with wallet:', input.walletAddress);

      const { data } = await loginMutation({
        variables: { input },
      });

      if (data?.loginWithWallet?.jwt) {
        const jwt = data.loginWithWallet.jwt;

        // Set JWT cookie (same as OAuth login)
        Cookies.set('token', jwt, {
          expires: 30, // 30 days
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });

        console.log('✅ Wallet login successful');
        return jwt;
      }

      throw new Error('No JWT returned from wallet login');
    } catch (err) {
      console.error('❌ Wallet login failed:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loginMutation]);

  // Sign message and login in one step
  const signAndLogin = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Generate message
      const message = generateLoginMessage(walletAddress);
      console.log('📝 Requesting signature for wallet login...');

      // Request signature from wallet
      const signature = await signMessage(message);
      console.log('✍️ Signature received');

      // Login with signature
      return await loginWithWallet({
        walletAddress,
        signature,
        message,
      });
    } catch (err) {
      console.error('❌ Sign and login failed:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loginWithWallet]);

  return {
    loginWithWallet,
    signAndLogin,
    loading,
    error,
  };
};
