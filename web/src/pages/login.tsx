import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Button } from 'components/common/Buttons/Button';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { FormValues, LoginForm } from 'components/LoginForm';
import SEO from 'components/SEO';
import { TopNavBarButton } from 'components/TopNavBarButton';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMagicContext } from 'hooks/useMagicContext';
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext';
import { Google } from 'icons/Google';
import { Discord } from 'icons/Discord';
import { Twitch } from 'icons/Twitch';
import { LeftArrow } from 'icons/LeftArrow';
import { LogoAndText } from 'icons/LogoAndText';
import { UserWarning } from 'icons/UserWarning';
import { setJwt } from 'lib/apollo';
import { AuthMethod, useLoginMutation, useMeQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { isApolloError } from '@apollo/client';
import styled from 'styled-components';
import Web3 from 'web3';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
`;

const ContentContainer = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  padding: 0 1rem;
`;

const HoverableButton = styled(Button)`
  transition: all 0.3s ease;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
    background: linear-gradient(45deg, #ffcc00, #ffeb3b);
    color: #000;
  }
`;

const HoverableInput = styled.input`
  transition: all 0.3s ease;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 4px;
  &:hover {
    border-color: #ffd700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
`;

// Detect in-app browsers that Google blocks for OAuth
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  // Instagram, Facebook, Twitter, LinkedIn, TikTok, Snapchat, WeChat in-app browsers
  const inAppPatterns = [
    /FBAN|FBAV/i,           // Facebook
    /Instagram/i,           // Instagram
    /Twitter/i,             // Twitter
    /LinkedInApp/i,         // LinkedIn
    /BytedanceWebview/i,    // TikTok
    /Snapchat/i,            // Snapchat
    /MicroMessenger/i,      // WeChat
    /Line\//i,              // Line
    /KAKAOTALK/i,           // KakaoTalk
    /Pinterest/i,           // Pinterest
  ];
  return inAppPatterns.some(pattern => pattern.test(ua));
}

// Get specific wallet provider when multiple wallets are installed
// This fixes the "wallet collision" where Coinbase hijacks window.ethereum
function getWalletProvider(walletType: 'metamask' | 'coinbase' | 'trust' | 'any'): any {
  if (typeof window === 'undefined') return null;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  // Check if multiple providers exist (EIP-5749)
  const providers = ethereum.providers || [];

  if (walletType === 'metamask') {
    // Find MetaMask specifically
    const metamaskProvider = providers.find((p: any) => p.isMetaMask && !p.isCoinbaseWallet);
    if (metamaskProvider) return metamaskProvider;
    // Fallback: check if single provider is MetaMask
    if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet) return ethereum;
    return null;
  }

  if (walletType === 'coinbase') {
    const coinbaseProvider = providers.find((p: any) => p.isCoinbaseWallet);
    if (coinbaseProvider) return coinbaseProvider;
    if (ethereum.isCoinbaseWallet) return ethereum;
    return null;
  }

  if (walletType === 'trust') {
    const trustProvider = providers.find((p: any) => p.isTrust);
    if (trustProvider) return trustProvider;
    if (ethereum.isTrust) return ethereum;
    return null;
  }

  // Return any available provider
  return ethereum;
}

// Detect ALL available wallet providers (for multi-wallet login options)
// Returns array of all detected wallets - SoundChain supports multiple wallet connections!
interface DetectedWallet {
  name: string;
  type: 'metamask' | 'coinbase' | 'trust' | 'rainbow';
  provider: any;
  icon: string;
}

function detectAllWallets(): DetectedWallet[] {
  if (typeof window === 'undefined') return [];

  const wallets: DetectedWallet[] = [];
  const ua = navigator.userAgent.toLowerCase();

  // In-app browser detection (mobile wallet browsers)
  const isInAppBrowser = ua.includes('metamask') || ua.includes('coinbase') ||
                         ua.includes('trust') || ua.includes('rainbow');

  // Check for MetaMask
  const metamaskProvider = getWalletProvider('metamask');
  if (metamaskProvider) {
    wallets.push({
      name: 'MetaMask',
      type: 'metamask',
      provider: metamaskProvider,
      icon: '🦊'
    });
  }

  // Check for Coinbase Wallet
  const coinbaseProvider = getWalletProvider('coinbase');
  if (coinbaseProvider) {
    wallets.push({
      name: 'Coinbase Wallet',
      type: 'coinbase',
      provider: coinbaseProvider,
      icon: '🔵'
    });
  }

  // Check for Trust Wallet
  const trustProvider = getWalletProvider('trust');
  if (trustProvider) {
    wallets.push({
      name: 'Trust Wallet',
      type: 'trust',
      provider: trustProvider,
      icon: '💙'
    });
  }

  // If in a specific wallet's in-app browser but no provider detected,
  // add fallback for that wallet
  if (wallets.length === 0 && isInAppBrowser) {
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      if (ua.includes('metamask')) {
        wallets.push({ name: 'MetaMask', type: 'metamask', provider: ethereum, icon: '🦊' });
      } else if (ua.includes('coinbase')) {
        wallets.push({ name: 'Coinbase Wallet', type: 'coinbase', provider: ethereum, icon: '🔵' });
      } else if (ua.includes('trust')) {
        wallets.push({ name: 'Trust Wallet', type: 'trust', provider: ethereum, icon: '💙' });
      }
    }
  }

  return wallets;
}

// Legacy function for backward compatibility
function isWalletBrowser(): { isWallet: boolean; walletName: string; provider: any } {
  const wallets = detectAllWallets();
  if (wallets.length === 0) return { isWallet: false, walletName: '', provider: null };
  // Return first wallet for backward compat
  return { isWallet: true, walletName: wallets[0].name, provider: wallets[0].provider };
}

export default function LoginPage() {
  const [login] = useLoginMutation();
  const [loggingIn, setLoggingIn] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false); // True while waiting for OTP modal
  const [error, setError] = useState<string | null>(null);
  const { data, loading: loadingMe } = useMeQuery({ skip: true });
  const me = data?.me;
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>();
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext();
  const { magic } = useMagicContext();
  const { setDirectConnection } = useUnifiedWallet();
  const [isClient, setIsClient] = useState(false);
  const [inAppBrowserWarning, setInAppBrowserWarning] = useState(false);
  const [walletBrowserInfo, setWalletBrowserInfo] = useState<{ isWallet: boolean; walletName: string; provider: any }>({ isWallet: false, walletName: '', provider: null });
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const isProcessingCredential = useRef(false); // Prevent multiple OAuth processing

  // Wallet signature login state
  const [walletLoginStep, setWalletLoginStep] = useState<'idle' | 'connecting' | 'signing' | 'success' | 'error'>('idle');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeWalletLogin, setActiveWalletLogin] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Detect in-app browser and warn user
    if (isInAppBrowser()) {
      setInAppBrowserWarning(true);
    }
    // Detect ALL available wallets (SoundChain multi-wallet support!)
    const wallets = detectAllWallets();
    setDetectedWallets(wallets);
    // Keep legacy walletBrowserInfo for backward compat
    if (wallets.length > 0) {
      setWalletBrowserInfo({ isWallet: true, walletName: wallets[0].name, provider: wallets[0].provider });
    }
  }, []);

  const topNavBarProps = useMemo(
    () => ({
      isLogin: false,
      leftButton: <TopNavBarButton onClick={() => setAuthMethod(undefined)} label="Back" icon={LeftArrow} />,
    }),
    [],
  );

  const handleError = useCallback(
    (error: Error) => {
      setLoggingIn(false);
      console.error('Login error:', error.message);
      if (isApolloError(error) && error.message === 'already exists') {
        const authMethodFromError = error.graphQLErrors?.find((err) => err.extensions?.with)?.extensions?.with as AuthMethod | undefined;
        setAuthMethod(authMethodFromError ? [authMethodFromError] : undefined);
      } else if (error.message.toLowerCase().includes('invalid credentials')) {
        router.push('/create-account');
      } else {
        setError(error.message || 'An unexpected error occurred during login');
        console.error('Login error message:', error.message);
        console.error('Login error stack:', error.stack);
      }
    },
    [router],
  );

  useEffect(() => {
    setTopNavBarProps(authMethod ? topNavBarProps : { isLogin: true });
    setIsAuthLayout(true);
    return () => {
      setIsAuthLayout(false);
    };
  }, [setTopNavBarProps, setIsAuthLayout, authMethod, topNavBarProps]);

  useEffect(() => {
    if (me && !loadingMe) {
      const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
      router.push(redirectUrl);
    }
  }, [me, loadingMe, router]);

  // Clean up any stale OAuth state on page load (from failed redirect attempts)
  useEffect(() => {
    if (!isClient) return;

    // Always clear OAuth redirect state - we use popup now
    const hadOAuthState = localStorage.getItem('oauth_provider');
    if (hadOAuthState) {
      console.log('[OAuth] Clearing stale redirect state');
      localStorage.removeItem('oauth_provider');
      localStorage.removeItem('oauth_callback');
      localStorage.removeItem('oauth_timestamp');
    }
  }, [isClient]);

  useEffect(() => {
    const validateToken = async () => {
      // Skip validation if user is already in login process or not client-side
      if (loggingIn || !isClient || !magic) {
        console.log('[validateToken] Skipping - login in progress or not ready');
        return;
      }

      const storedToken = localStorage.getItem('didToken');
      if (storedToken) {
        try {
          // Use timeout to prevent hanging on isLoggedIn check
          const isLoggedInPromise = magic.user.isLoggedIn();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('isLoggedIn timeout')), 5000)
          );

          const isLoggedIn = await Promise.race([isLoggedInPromise, timeoutPromise]);
          if (isLoggedIn) {
            console.log('[validateToken] User is logged in, using stored token');
            const loginResult = await login({ variables: { input: { token: storedToken } } });
            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              await new Promise(resolve => setTimeout(resolve, 200));
              const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
              router.push(redirectUrl);
            }
          } else {
            console.log('[validateToken] User not logged in, clearing token');
            localStorage.removeItem('didToken');
          }
        } catch (error: any) {
          console.log('[validateToken] Check failed:', error.message);
          // Don't clear token on timeout - just proceed with login flow
          if (!error.message?.includes('timeout')) {
            localStorage.removeItem('didToken');
          }
        }
      }
    };
    validateToken();
  }, [isClient, login, router, loggingIn, magic]);

  // Detect if we're on mobile
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleSocialLogin = (provider: 'google' | 'discord' | 'twitch') => {
    console.log(`[OAuth2] handleSocialLogin called for ${provider}`);

    // Check for in-app browser (Google blocks OAuth in these)
    if (isInAppBrowser() && provider === 'google') {
      setError('Google login is blocked in this browser. Please open in Safari or Chrome, or use Email login.');
      return;
    }

    if (!magic) {
      setError('Login not ready. Please refresh the page and try again.');
      return;
    }

    // Check for oauth2 extension (from @magic-ext/oauth2)
    if (!(magic as any).oauth2) {
      setError('OAuth not available. Please refresh the page and try again.');
      return;
    }

    // CRITICAL: Call loginWithPopup IMMEDIATELY without any async work before it
    // Chrome blocks popups if they're not triggered synchronously from user action
    // Do NOT await, setState, or localStorage before this call!
    console.log(`[OAuth] Opening popup for ${provider} IMMEDIATELY (no async before)`);

    const popupPromise = (magic as any).oauth2.loginWithPopup({
      provider,
      scope: ['openid'],
    });

    // NOW we can do async work - popup is already opening
    setLoggingIn(true);
    setError(null);
    localStorage.removeItem('didToken');

    // Handle the popup result
    popupPromise
      .then(async (result: any) => {
        console.log('[OAuth] Popup completed, result:', result);

        if (result?.magic?.idToken) {
          const loginResult = await login({ variables: { input: { token: result.magic.idToken } } });
          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt);
            localStorage.setItem('didToken', result.magic.idToken);
            const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
            router.push(redirectUrl);
            return;
          }
        }
        throw new Error('OAuth login failed - no token received');
      })
      .catch((error: any) => {
        console.error('[OAuth] Login error:', error);
        if (error.message?.includes('popup') || error.message?.includes('blocked')) {
          setError('Popup was blocked. Please allow popups for soundchain.io and try again.');
        } else if (error.message?.includes('closed') || error.message?.includes('cancelled')) {
          setError('Login cancelled. Please try again.');
        } else {
          setError(error.message || `${provider} login failed. Please try again.`);
        }
        setLoggingIn(false);
      });
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleDiscordLogin = () => handleSocialLogin('discord');
  const handleTwitchLogin = () => handleSocialLogin('twitch');

  // Wallet signature login - works natively in wallet browsers
  // Uses specific provider to avoid wallet collision (MetaMask vs Coinbase)
  // Accepts optional wallet parameter for multi-wallet support
  const handleWalletLogin = async (wallet?: DetectedWallet) => {
    // Use specific wallet if provided, otherwise fall back to first detected or walletBrowserInfo
    const targetWallet = wallet || detectedWallets[0];
    const provider = targetWallet?.provider || walletBrowserInfo.provider || (window as any).ethereum;
    const walletName = targetWallet?.name || walletBrowserInfo.walletName || 'wallet';

    if (!provider) {
      setError('No wallet detected. Please install MetaMask or another wallet.');
      return;
    }

    setWalletLoginStep('connecting');
    setActiveWalletLogin(walletName);
    setError(null);

    try {
      // Step 1: Request wallet connection using the SPECIFIC provider
      console.log('[WalletLogin] Requesting accounts from', walletName, '...');
      const accounts = await provider.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const address = accounts[0];
      setWalletAddress(address);
      console.log('[WalletLogin] Connected:', address);

      // Step 2: Get chain ID
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex as string, 16);
      console.log('[WalletLogin] Chain ID:', chainId);

      // Step 3: Sign a message to verify ownership
      setWalletLoginStep('signing');

      // Create SIWE-style message
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Welcome to SoundChain!

Sign this message to verify your wallet ownership.

Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature does NOT trigger a blockchain transaction or cost any gas fees.`;

      console.log('[WalletLogin] Requesting signature...');

      // Request signature using personal_sign with the SPECIFIC provider
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });

      console.log('[WalletLogin] Signature received:', signature?.slice(0, 20) + '...');

      // Step 4: Verify signature client-side using Web3
      // This confirms the user actually controls the wallet
      const web3 = new Web3(provider as any);
      const recoveredAddress = web3.eth.accounts.recover(message, signature as string);

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signature verification failed - address mismatch');
      }

      console.log('[WalletLogin] Signature verified!');

      // Step 5: Success! Store wallet session and update context
      setWalletLoginStep('success');

      // Determine wallet type from the provider we used
      const walletType = provider.isMetaMask ? 'metamask' :
                        provider.isCoinbaseWallet ? 'coinbase' :
                        provider.isTrust ? 'trust' : 'injected';

      // Update the unified wallet context
      setDirectConnection(address, walletType, chainId);

      // Store wallet session info
      localStorage.setItem('soundchain_wallet_session', JSON.stringify({
        address,
        walletType,
        chainId,
        signature: signature as string,
        timestamp,
        nonce,
      }));

      console.log('[WalletLogin] Session stored, redirecting...');

      // Brief delay to show success, then redirect
      setTimeout(() => {
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
      }, 1000);

    } catch (err: any) {
      console.error('[WalletLogin] Error:', err);
      setWalletLoginStep('error');

      // Handle user rejection gracefully
      if (err.code === 4001 || err.message?.includes('User rejected') || err.message?.includes('User denied')) {
        setError('Wallet connection cancelled. Please try again.');
      } else {
        setError(err.message || 'Wallet login failed. Please try again.');
      }
    }
  };

  // Unified handler for magic_credential callbacks (OAuth and Email Magic Links)
  // Uses ref to prevent multiple concurrent runs (state is async, ref is sync)
  useEffect(() => {
    async function handleMagicCredential() {
      // Use ref for instant check - state updates are async and cause race conditions
      if (!magic || !magicParam || isProcessingCredential.current) {
        return;
      }

      // Mark as processing IMMEDIATELY (sync) before any async work
      isProcessingCredential.current = true;
      setLoggingIn(true);
      setError(null);

      try {
        console.log('[Auth] Processing magic_credential callback - trying OAuth first');

        // Try OAuth with timeout to prevent infinite hanging
        let oauthResult = null;
        let oauthError: any = null;
        try {
          const oauthPromise = (magic as any).oauth2.getRedirectResult();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OAuth timeout after 10s')), 10000)
          );
          oauthResult = await Promise.race([oauthPromise, timeoutPromise]);
          console.log('[OAuth] getRedirectResult returned:', oauthResult);
        } catch (err: any) {
          oauthError = err;
          console.log('[OAuth] getRedirectResult error:', err?.message);
        }

        if (oauthResult?.magic?.idToken) {
          console.log('[OAuth] Got OAuth result with idToken');
          const loginResult = await login({ variables: { input: { token: oauthResult.magic.idToken } } });
          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt);
            localStorage.setItem('didToken', oauthResult.magic.idToken);
            const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
            router.push(redirectUrl);
            return;
          } else {
            throw new Error('OAuth login failed: No JWT returned from server');
          }
        }

        // If OAuth timed out or had a specific error, don't try magic link - show error
        if (oauthError) {
          throw new Error(`Google login failed: ${oauthError.message}. Please try again.`);
        }

        // Only try magic link if OAuth returned null (meaning this is actually a magic link callback)
        console.log('[Auth] No OAuth result, trying email magic link');
        await magic.auth.loginWithCredential();
        const didToken = await magic.user.getIdToken();
        console.log('[MagicLink] Received didToken from credential');
        localStorage.setItem('didToken', didToken);
        const loginResult = await login({ variables: { input: { token: didToken } } });
        if (loginResult.data?.login.jwt) {
          await setJwt(loginResult.data.login.jwt);
          await new Promise(resolve => setTimeout(resolve, 200));
          const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
          router.push(redirectUrl);
        } else {
          throw new Error('Login failed: No JWT returned');
        }
      } catch (error: any) {
        console.error('[Auth] Callback error:', error);
        if (error.message?.includes('already exists')) {
          const authMethodFromError = error.graphQLErrors?.find((err: any) => err.extensions?.with)?.extensions?.with;
          if (authMethodFromError) setAuthMethod([authMethodFromError]);
        } else if (error.message?.toLowerCase().includes('invalid credentials')) {
          router.push('/create-account');
        } else {
          setError(error.message || 'Login failed. Please try again.');
        }
        setLoggingIn(false);
        isProcessingCredential.current = false;
      }
    }
    handleMagicCredential();
  }, [magic, magicParam, login, handleError, router]);

  async function handleSubmit(values: FormValues) {
    try {
      if (!magic) throw new Error('Magic SDK not initialized. Please refresh the page.');
      console.log('[Email] Starting login process for email:', values.email);
      setError(null);

      // Use Email OTP - shows modal with 6-digit code input
      console.log('[Email] Sending OTP code to email...');

      // Set waitingForOtp true - this keeps the login form visible so Magic's OTP modal can appear
      setWaitingForOtp(true);

      let didToken: string;

      // Create a timeout promise for OTP (90 seconds - users need time to check email and enter code)
      const otpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OTP_TIMEOUT')), 90000)
      );

      try {
        // Try OTP first (better UX when it works)
        // Note: This will show Magic's OTP modal overlay on top of the login page
        console.log('[Email] Waiting for Magic OTP modal to appear...');
        didToken = await Promise.race([
          magic.auth.loginWithEmailOTP({ email: values.email }),
          otpTimeout,
        ]);
      } catch (otpError: any) {
        setWaitingForOtp(false);

        // Check if user cancelled the OTP modal
        if (otpError.message?.includes('User denied') || otpError.message?.includes('cancelled')) {
          console.log('[Email] User cancelled OTP modal');
          setError(null);
          return;
        }

        if (otpError.message === 'OTP_TIMEOUT') {
          // OTP modal likely blocked or user didn't receive code - fall back to magic link
          console.log('[Email] OTP timed out, trying magic link fallback');
          setError('OTP timed out. Sending a login link to your email instead...');

          // Send magic link - user must click link in email
          try {
            setWaitingForOtp(true);
            didToken = await magic.auth.loginWithMagicLink({
              email: values.email,
              showUI: true,
            });
            setWaitingForOtp(false);
          } catch (magicLinkError: any) {
            console.error('[Email] Magic link error:', magicLinkError);
            setError('Failed to send login email. Please try again.');
            setWaitingForOtp(false);
            return;
          }
        } else {
          throw otpError;
        }
      }

      // OTP or Magic Link complete - now process the token
      setWaitingForOtp(false);
      setLoggingIn(true);
      setError(null);

      console.log('[Email] Authentication completed!');
      console.log('[Email] Received didToken');
      localStorage.setItem('didToken', didToken);

      if (!didToken) {
        throw new Error('Error connecting Magic: No token returned');
      }

      const result = await login({ variables: { input: { token: didToken } } });
      console.log('[Email] GraphQL login mutation result:', result.data?.login ? 'success' : 'failed');

      if (result.data?.login.jwt) {
        // Wait for JWT to be fully set before redirecting
        await setJwt(result.data.login.jwt);

        // Additional delay to ensure Apollo cache is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        console.log('[Email] Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } else {
        throw new Error('Login failed: No JWT returned');
      }
    } catch (error: any) {
      console.error('[Email] Login error:', error);
      setWaitingForOtp(false);
      // Handle user cancellation gracefully
      if (error.message?.includes('User denied') || error.message?.includes('cancelled')) {
        setError('Login cancelled. Please try again.');
      } else {
        handleError(error as Error);
      }
      setLoggingIn(false);
    }
  }

  const GoogleButton = () => (
    <button
      className="flex items-center justify-center gap-2 rounded-lg bg-transparent px-4 py-3 text-sm font-semibold text-white w-64 transition-all hover:scale-105 hover:text-yellow-400"
      onClick={handleGoogleLogin}
    >
      <Google className="h-5 w-5" />
      <span>Login with Google</span>
    </button>
  );

  const DiscordButton = () => (
    <button
      className="flex items-center justify-center gap-2 rounded-lg bg-transparent px-4 py-3 text-sm font-semibold text-white w-64 transition-all hover:scale-105 hover:text-[#5865F2]"
      onClick={handleDiscordLogin}
    >
      <Discord className="h-5 w-5" />
      <span>Login with Discord</span>
    </button>
  );

  const TwitchButton = () => (
    <button
      className="flex items-center justify-center gap-2 rounded-lg bg-transparent px-4 py-3 text-sm font-semibold text-white w-64 transition-all hover:scale-105 hover:text-[#9146FF]"
      onClick={handleTwitchLogin}
    >
      <Twitch className="h-5 w-5" />
      <span>Login with Twitch</span>
    </button>
  );

  if (!isClient) {
    return null;
  }

  if (loadingMe || (me && !loggingIn)) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex h-full w-full items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
        </div>
      </>
    );
  }

  // Only show full-screen loader after OTP/magic link completes (processing token)
  // During OTP, keep login form visible so Magic's modal can appear on top
  if (loggingIn && !waitingForOtp) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex h-full w-full flex-col items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
          <span className="text-white ml-2 mt-4">Logging in...</span>
        </div>
      </>
    );
  }

  if (authMethod) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <Overlay />
        <ContentContainer>
          <div className="flex justify-center pt-32 pb-6">
            <UserWarning className="text-yellow-400" />
          </div>
          <div className="py-4 text-center text-sm text-white font-semibold">
            An account already exists with that email.
            <br />
            <br />
            If you wish to login to an existing account, you must use the same method previously:
          </div>
          {authMethod.includes(AuthMethod.Google) && <GoogleButton />}
          {(authMethod as any).includes('discord') && <DiscordButton />}
          {(authMethod as any).includes('twitch') && <TwitchButton />}
          {authMethod.includes(AuthMethod.MagicLink) && <LoginForm handleMagicLogin={handleSubmit} />}
          <div className="flex h-full flex-col justify-between">
            <div className="py-4 text-center text-sm text-white font-semibold">
              Or create a new account with the same email.
            </div>
            <NextLink href="/create-account">
              <HoverableButton variant="rainbow" borderColor="bg-purple-gradient">
                CREATE NEW ACCOUNT
              </HoverableButton>
            </NextLink>
          </div>
        </ContentContainer>
      </>
    );
  }

  return (
    <>
      <SEO title="Login | SoundChain" description="Log in to SoundChain" canonicalUrl="/login/" />
      <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-y-auto py-8">
        {/* Background GIF with proper scaling - fixed to viewport */}
        <div className="fixed inset-0 z-0">
          <img
            src="/images/login-background.gif"
            alt="Login background"
            className="min-h-full min-w-full object-cover"
            style={{
              objectFit: 'cover',
              width: '100vw',
              height: '100vh',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
        <Overlay />
        <ContentContainer>
          <div className="mb-2 flex h-36 items-center justify-center">
            <LogoAndText className="text-white filter drop-shadow-lg" />
          </div>
          {inAppBrowserWarning && (
            <div className="mb-4 rounded-lg bg-yellow-500/20 border border-yellow-500 p-4 text-center">
              <p className="text-sm font-semibold text-yellow-400">
                You're using an in-app browser
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                For Google login, tap ⋮ or ⋯ menu and select "Open in Safari/Chrome"
              </p>
              <p className="text-xs text-white mt-2">
                Or use <strong>Email login</strong> below - it works everywhere!
              </p>
            </div>
          )}
          {/* ═══════════════════════════════════════════════════════════════
              SECTION 1: CONNECT WALLET (Guest Access)
              - No account needed
              - Browse marketplace, buy/sell NFTs
              ═══════════════════════════════════════════════════════════════ */}
          <div className="mb-6 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/50 p-5">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <span>🔗</span> Connect Wallet
              </h2>
              <p className="text-sm text-cyan-300 mt-1">Guest Access</p>
              <p className="text-xs text-gray-400 mt-2">
                Browse marketplace & buy/sell NFTs - no account needed
              </p>
            </div>

            {walletLoginStep === 'idle' && (
              <div className="space-y-2">
                {/* Detected wallet extensions */}
                {detectedWallets.map((wallet) => (
                  <button
                    key={wallet.type}
                    onClick={() => handleWalletLogin(wallet)}
                    className="w-full py-3 px-4 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500/50 text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">{wallet.icon}</span>
                    <span>{wallet.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">DETECTED</span>
                  </button>
                ))}

                {/* WalletConnect - always show */}
                <button
                  onClick={() => {
                    // Open WalletConnect modal via the DEX wallet page
                    window.location.href = '/dex/wallet?connect=walletconnect';
                  }}
                  className="w-full py-3 px-4 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500/50 text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <span className="text-xl">🌐</span>
                  <span>WalletConnect</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">300+ WALLETS</span>
                </button>

                <p className="text-[11px] text-gray-500 text-center mt-3">
                  Connect to browse, bid on auctions, and purchase NFTs
                </p>
              </div>
            )}

            {walletLoginStep === 'connecting' && (
              <div className="py-4 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-cyan-300 font-medium">Connecting to {activeWalletLogin}...</p>
                <p className="text-xs text-gray-400 mt-1">Please approve in your wallet</p>
              </div>
            )}

            {walletLoginStep === 'signing' && (
              <div className="py-4 text-center">
                <div className="animate-pulse text-4xl mb-3">✍️</div>
                <p className="text-cyan-300 font-medium">Sign to verify ownership</p>
                <p className="text-xs text-gray-400 mt-1">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
                <p className="text-xs text-cyan-400 mt-2">No gas fees - just a signature</p>
              </div>
            )}

            {walletLoginStep === 'success' && (
              <div className="py-4 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-green-400 font-bold">Wallet Connected!</p>
                <p className="text-sm text-white mt-1 font-mono">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
                <p className="text-xs text-gray-400 mt-2">Redirecting to marketplace...</p>
              </div>
            )}

            {walletLoginStep === 'error' && (
              <div className="py-3 text-center">
                <button
                  onClick={() => { setWalletLoginStep('idle'); setError(null); }}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              DIVIDER
              ═══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            <span className="text-xs text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2: LOGIN / SIGN UP (Full Access)
              - Create account or login to existing
              - Social features, streaming rewards
              ═══════════════════════════════════════════════════════════════ */}
          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/50 p-5">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <span>👤</span> Login / Sign Up
              </h2>
              <p className="text-sm text-purple-300 mt-1">Full Access</p>
              <p className="text-xs text-gray-400 mt-2">
                Post, comment, follow artists & earn streaming rewards
              </p>
            </div>
            {waitingForOtp && (
              <div className="mb-4 rounded-lg bg-cyan-500/20 border border-cyan-500 p-4 text-center animate-pulse">
                <p className="text-sm font-semibold text-cyan-400">
                  Check your email for a 6-digit code
                </p>
                <p className="text-xs text-cyan-300 mt-1">
                  Magic's popup should appear. If not, check your spam folder.
                </p>
              </div>
            )}
            {error && (
              <div className="py-3 text-center text-sm text-red-500 font-semibold drop-shadow-md">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <GoogleButton />
              <DiscordButton />
              <TwitchButton />
            </div>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-xs text-gray-500">or use email</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
            <LoginForm handleMagicLogin={handleSubmit} disabled={waitingForOtp} />
          </div>
        </ContentContainer>
      </div>
    </>
  );
}
