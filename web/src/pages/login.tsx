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
import { AuthMethod, useLoginMutation, useMeQuery, useUserByWalletLazyQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { isApolloError } from '@apollo/client';
import styled from 'styled-components';
import Web3 from 'web3';
import { useWalletLogin, generateLoginMessage } from 'hooks/useWalletLogin';

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
  max-width: 320px;
  margin: 0 auto;
  padding: 0 0.75rem;
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

// Detect wallet in-app browsers (MetaMask, Coinbase, Trust, etc.)
function isWalletBrowser(): { isWallet: boolean; walletName: string } {
  if (typeof window === 'undefined') return { isWallet: false, walletName: '' };
  const ua = navigator.userAgent.toLowerCase();
  const ethereum = (window as any).ethereum;

  // Check user agent for in-app wallet browsers
  if (ua.includes('metamask')) return { isWallet: true, walletName: 'MetaMask' };
  if (ua.includes('coinbase')) return { isWallet: true, walletName: 'Coinbase Wallet' };
  if (ua.includes('trust')) return { isWallet: true, walletName: 'Trust Wallet' };
  if (ua.includes('rainbow')) return { isWallet: true, walletName: 'Rainbow' };

  // Check window.ethereum for injected wallet (desktop extension or mobile dapp browser)
  if (ethereum?.isMetaMask && !ethereum?.isCoinbaseWallet) return { isWallet: true, walletName: 'MetaMask' };
  if (ethereum?.isCoinbaseWallet) return { isWallet: true, walletName: 'Coinbase Wallet' };
  if (ethereum?.isTrust) return { isWallet: true, walletName: 'Trust Wallet' };

  return { isWallet: false, walletName: '' };
}

// Check if ANY wallet is available (extension or injected)
function hasWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
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
  const { setDirectConnection, connectWeb3Modal, isWeb3ModalReady, activeAddress: web3ModalAddress, activeWalletType } = useUnifiedWallet();
  const { loginWithWallet: walletLoginMutation, loading: walletLoginLoading } = useWalletLogin();
  const [checkWalletUser] = useUserByWalletLazyQuery();
  const [isClient, setIsClient] = useState(false);
  const [inAppBrowserWarning, setInAppBrowserWarning] = useState(false);
  const [walletBrowserInfo, setWalletBrowserInfo] = useState<{ isWallet: boolean; walletName: string }>({ isWallet: false, walletName: '' });
  const [hasWallet, setHasWallet] = useState(false); // Any wallet available (extension or injected)
  const isProcessingCredential = useRef(false); // Prevent multiple OAuth processing

  // Wallet signature login state
  const [walletLoginStep, setWalletLoginStep] = useState<'idle' | 'connecting' | 'checking' | 'register' | 'signing' | 'success' | 'error'>('idle');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isNewWalletUser, setIsNewWalletUser] = useState(false);
  const [walletHandle, setWalletHandle] = useState('');
  const [walletDisplayName, setWalletDisplayName] = useState('');
  const [walletTermsAccepted, setWalletTermsAccepted] = useState(false);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [signedSignature, setSignedSignature] = useState<string | null>(null);
  const [selectedWalletType, setSelectedWalletType] = useState<'metamask' | 'walletconnect' | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Detect in-app browser and warn user
    if (isInAppBrowser()) {
      setInAppBrowserWarning(true);
    }
    // Detect wallet browser or extension
    const walletInfo = isWalletBrowser();
    setWalletBrowserInfo(walletInfo);
    // Check if ANY wallet is available
    setHasWallet(hasWalletAvailable());
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

  const handleSocialLogin = async (provider: 'google' | 'discord' | 'twitch') => {
    console.log(`[OAuth2] handleSocialLogin called for ${provider}`);

    try {
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

      setLoggingIn(true);
      setError(null);
      localStorage.removeItem('didToken');

      // Always use popup - Magic SDK handles mobile internally with pseudo-popup
      // Redirect flow causes page refresh issues on Chrome mobile
      console.log('[OAuth] Using popup for all platforms', provider);

      const result = await (magic as any).oauth2.loginWithPopup({
        provider,
        scope: ['openid'],
      });

      console.log('[OAuth] Popup result:', result);

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
    } catch (error: any) {
      console.error('[OAuth2] Error:', error);

      // Provide helpful error message based on error type
      let userMessage = `${provider} login failed. Please try again.`;

      if (error.message?.includes('SERVER_ERROR') || error.message?.includes('500') || error.message?.includes('network')) {
        userMessage = `${provider} login temporarily unavailable. Try again in a moment, or use Email login.`;
      } else if (error.message?.includes('timeout')) {
        userMessage = `${provider} login timed out. Check your internet connection and try again.`;
      } else if (error.message?.includes('cancelled') || error.message?.includes('denied') || error.message?.includes('closed')) {
        userMessage = 'Login cancelled. Please try again.';
      }

      setError(userMessage);
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleDiscordLogin = () => handleSocialLogin('discord');
  const handleTwitchLogin = () => handleSocialLogin('twitch');

  // Wallet signature login - works natively in wallet browsers
  // This calls the backend loginWithWallet mutation to get a real JWT and create/find user
  const handleWalletLogin = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No wallet detected. Please use a wallet browser.');
      return;
    }

    setWalletLoginStep('connecting');
    setError(null);

    try {
      // Step 1: Request wallet connection
      console.log('[WalletLogin] Requesting accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const address = accounts[0];
      setWalletAddress(address);
      console.log('[WalletLogin] Connected:', address);

      // Step 2: Check if this wallet user already exists
      setWalletLoginStep('checking');
      console.log('[WalletLogin] Checking if user exists...');

      const { data: existingUser } = await checkWalletUser({
        variables: { walletAddress: address }
      });

      if (existingUser?.getUserByWallet) {
        // EXISTING USER - proceed directly to sign & login
        console.log('[WalletLogin] Existing user found, proceeding to sign...');
        await signAndCompleteWalletLogin(address);
      } else {
        // NEW USER - show registration form first
        console.log('[WalletLogin] New wallet user, showing registration form...');
        setIsNewWalletUser(true);
        setWalletLoginStep('register');
        // Pre-fill display name with wallet prefix
        setWalletDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
      }

    } catch (err: any) {
      console.error('[WalletLogin] Error:', err);
      setWalletLoginStep('error');

      if (err.code === 4001 || err.message?.includes('User rejected') || err.message?.includes('User denied')) {
        setError('Wallet connection cancelled. Please try again.');
      } else {
        setError(err.message || 'Wallet login failed. Please try again.');
      }
    }
  };

  // Complete wallet login after connecting (for existing users) or after registration (for new users)
  const signAndCompleteWalletLogin = async (address: string, handle?: string, displayName?: string) => {
    try {
      setWalletLoginStep('signing');

      // Get chain ID
      const chainIdHex = await window.ethereum!.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex as string, 16);

      // Generate and sign message
      const message = generateLoginMessage(address);
      console.log('[WalletLogin] Requesting signature...');

      const signature = await window.ethereum!.request({
        method: 'personal_sign',
        params: [message, address],
      });

      console.log('[WalletLogin] Signature received, calling backend...');

      // Call backend mutation with optional handle/displayName for new users
      const jwt = await walletLoginMutation({
        walletAddress: address,
        signature: signature as string,
        message,
        ...(handle && { handle }),
        ...(displayName && { displayName }),
      });

      if (!jwt) {
        throw new Error('Backend authentication failed - no JWT returned');
      }

      console.log('[WalletLogin] Backend authenticated! JWT received.');

      await setJwt(jwt);
      setWalletLoginStep('success');

      const walletType = window.ethereum!.isMetaMask ? 'metamask' :
                        (window as any).ethereum?.isCoinbaseWallet ? 'coinbase' :
                        (window as any).ethereum?.isTrust ? 'trust' : 'injected';

      setDirectConnection(address, walletType, chainId);

      console.log('[WalletLogin] Success! Redirecting...');

      // Redirect to feed - new wallet users already set handle/displayName on login page
      // They can complete profile (picture, bio, etc.) from settings later
      setTimeout(() => {
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
      }, 1000);

    } catch (err: any) {
      console.error('[WalletLogin] Sign error:', err);
      setWalletLoginStep('error');

      if (err.code === 4001 || err.message?.includes('User rejected') || err.message?.includes('User denied')) {
        setError('Signature rejected. Please try again.');
      } else {
        setError(err.message || 'Wallet login failed. Please try again.');
      }
    }
  };

  // Handle WalletConnect login (Trust, Rainbow, etc.)
  const handleWalletConnectLogin = async () => {
    if (!isWeb3ModalReady) {
      setError('WalletConnect not ready. Please try again.');
      return;
    }

    setSelectedWalletType('walletconnect');
    setWalletLoginStep('connecting');
    setError(null);

    try {
      console.log('[WalletConnect] Opening Web3Modal...');
      await connectWeb3Modal();
      // Note: The actual connection result comes through the activeAddress state
      // We'll handle this in a useEffect
    } catch (err: any) {
      console.error('[WalletConnect] Error:', err);
      setWalletLoginStep('error');
      setError(err.message || 'WalletConnect failed. Please try again.');
    }
  };

  // Watch for WalletConnect connection result
  useEffect(() => {
    const handleWeb3ModalConnection = async () => {
      if (selectedWalletType === 'walletconnect' && web3ModalAddress && walletLoginStep === 'connecting') {
        console.log('[WalletConnect] Connected:', web3ModalAddress);
        setWalletAddress(web3ModalAddress);

        // Check if user exists
        setWalletLoginStep('checking');
        const { data: existingUser } = await checkWalletUser({
          variables: { walletAddress: web3ModalAddress }
        });

        if (existingUser?.getUserByWallet) {
          console.log('[WalletConnect] Existing user, signing...');
          await signAndCompleteWalletConnectLogin(web3ModalAddress);
        } else {
          console.log('[WalletConnect] New user, showing registration...');
          setIsNewWalletUser(true);
          setWalletLoginStep('register');
          setWalletDisplayName(`${web3ModalAddress.slice(0, 6)}...${web3ModalAddress.slice(-4)}`);
        }
      }
    };
    handleWeb3ModalConnection();
  }, [web3ModalAddress, selectedWalletType, walletLoginStep]);

  // Sign via WalletConnect provider
  const signAndCompleteWalletConnectLogin = async (address: string, handle?: string, displayName?: string) => {
    try {
      setWalletLoginStep('signing');

      const message = generateLoginMessage(address);
      console.log('[WalletConnect] Requesting signature...');

      // Get the Web3Modal provider from window.ethereum (WalletConnect injects it)
      const provider = (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }

      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });

      console.log('[WalletConnect] Signature received, calling backend...');

      const jwt = await walletLoginMutation({
        walletAddress: address,
        signature: signature as string,
        message,
        ...(handle && { handle }),
        ...(displayName && { displayName }),
      });

      if (!jwt) {
        throw new Error('Backend authentication failed');
      }

      await setJwt(jwt);
      setWalletLoginStep('success');
      setDirectConnection(address, 'web3modal', 137);

      setTimeout(() => {
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
      }, 1000);

    } catch (err: any) {
      console.error('[WalletConnect] Sign error:', err);
      setWalletLoginStep('error');
      setError(err.message || 'Signature failed. Please try again.');
    }
  };

  // Handle wallet registration form submission
  const handleWalletRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }

    if (!walletHandle.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!walletTermsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    console.log('[WalletLogin] Submitting registration:', { handle: walletHandle, displayName: walletDisplayName, walletType: selectedWalletType });

    // Use appropriate sign function based on wallet type
    if (selectedWalletType === 'walletconnect') {
      await signAndCompleteWalletConnectLogin(walletAddress, walletHandle.trim(), walletDisplayName.trim() || undefined);
    } else {
      await signAndCompleteWalletLogin(walletAddress, walletHandle.trim(), walletDisplayName.trim() || undefined);
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
        // Longer timeout for mobile networks (cellular can be slow)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const timeoutMs = isMobile ? 30000 : 15000;
        let oauthResult = null;
        let oauthError: any = null;
        try {
          const oauthPromise = (magic as any).oauth2.getRedirectResult();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`OAuth timeout after ${timeoutMs/1000}s`)), timeoutMs)
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
      className="flex items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-white w-full transition-all hover:bg-white/10 hover:text-yellow-400"
      onClick={handleGoogleLogin}
    >
      <Google className="h-4 w-4" />
      <span>Google</span>
    </button>
  );

  const DiscordButton = () => (
    <button
      className="flex items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-white w-full transition-all hover:bg-white/10 hover:text-[#5865F2]"
      onClick={handleDiscordLogin}
    >
      <Discord className="h-4 w-4" />
      <span>Discord</span>
    </button>
  );

  const TwitchButton = () => (
    <button
      className="flex items-center justify-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-white w-full transition-all hover:bg-white/10 hover:text-[#9146FF]"
      onClick={handleTwitchLogin}
    >
      <Twitch className="h-4 w-4" />
      <span>Twitch</span>
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
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
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
          {/* VIP Wallet Login - Compact */}
          {walletLoginStep !== 'success' && (
            <div className="mb-3 rounded-xl bg-black/40 border border-purple-500/30 p-3 text-center backdrop-blur-sm w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg">{walletBrowserInfo.walletName === 'MetaMask' ? '🦊' : '💎'}</span>
                <div>
                  <p className="text-sm font-semibold text-white">Web3 Wallet Ready</p>
                  <p className="text-[10px] text-purple-300">Decentralized • Self-Custody • No Email</p>
                </div>
              </div>

              {walletLoginStep === 'idle' && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {hasWallet && (
                      <button
                        onClick={() => { setSelectedWalletType('metamask'); handleWalletLogin(); }}
                        className="py-2 px-2 bg-orange-500/10 border border-orange-500/30 hover:border-orange-400 rounded-lg text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🦊</span>
                        <span>{walletBrowserInfo.walletName || 'MetaMask'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleWalletConnectLogin}
                      disabled={!isWeb3ModalReady}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                        isWeb3ModalReady
                          ? 'bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 text-white'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-500'
                      }`}
                    >
                      <span>🔗</span>
                      <span>{isWeb3ModalReady ? 'WalletConnect' : '...'}</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500">Trust, Rainbow, Ledger + 300 more</p>
                </>
              )}

              {walletLoginStep === 'connecting' && (
                <div className="py-2">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-purple-300 font-medium text-sm">Connecting...</p>
                  <p className="text-[10px] text-gray-400">Approve in wallet</p>
                </div>
              )}

              {walletLoginStep === 'checking' && (
                <div className="py-2">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-cyan-300 font-medium text-sm">Checking...</p>
                  <p className="text-[10px] text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
                </div>
              )}

              {/* Registration Form - Compact */}
              {walletLoginStep === 'register' && (
                <form onSubmit={handleWalletRegistration} className="space-y-2">
                  <div className="text-center mb-2">
                    <p className="text-green-400 font-semibold text-sm">Welcome to SoundChain!</p>
                    <p className="text-[10px] text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
                  </div>

                  <input
                    type="text"
                    value={walletDisplayName}
                    onChange={(e) => setWalletDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                  />

                  <input
                    type="text"
                    value={walletHandle}
                    onChange={(e) => setWalletHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="username *"
                    maxLength={24}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                  />

                  <label className="flex items-center gap-2 text-[10px] text-gray-400">
                    <input
                      type="checkbox"
                      checked={walletTermsAccepted}
                      onChange={(e) => setWalletTermsAccepted(e.target.checked)}
                      className="h-3 w-3 rounded border-cyan-500 bg-black text-cyan-500"
                    />
                    I agree to <a href="/terms-and-conditions" className="text-cyan-400" target="_blank">Terms</a> & <a href="/privacy-policy" className="text-cyan-400" target="_blank">Privacy</a>
                  </label>

                  <button
                    type="submit"
                    disabled={!walletHandle.trim() || !walletTermsAccepted}
                    className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${
                      walletHandle.trim() && walletTermsAccepted
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    Create Account
                  </button>

                  <button type="button" onClick={() => { setWalletLoginStep('idle'); setIsNewWalletUser(false); }} className="w-full text-gray-500 hover:text-gray-400 text-xs">← Back</button>
                </form>
              )}

              {walletLoginStep === 'signing' && (
                <div className="py-2">
                  <div className="animate-pulse text-2xl mb-1">✍️</div>
                  <p className="text-cyan-300 font-semibold text-sm">Sign Message</p>
                  <p className="text-[10px] text-gray-400">Check your wallet</p>
                </div>
              )}

              {walletLoginStep === 'error' && (
                <button
                  onClick={() => { setWalletLoginStep('idle'); setError(null); setIsNewWalletUser(false); }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-md"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Success */}
          {walletLoginStep === 'success' && (
            <div className="mb-3 rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-center">
              <p className="text-green-400 font-semibold text-sm">✅ Verified!</p>
              <p className="text-[10px] text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
            </div>
          )}

          {/* Divider */}
          {walletLoginStep === 'idle' && (
            <div className="flex items-center gap-2 my-2 w-full">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-600 text-[10px]">OR</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
          )}

          {/* Logo - compact */}
          {walletLoginStep === 'idle' && (
            <div className="mb-2 flex h-12 items-center justify-center">
              <LogoAndText className="text-white h-8" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-2 py-2 px-3 rounded-md bg-red-500/20 border border-red-500/50 text-center text-xs text-red-400 w-full">
              {error}
            </div>
          )}

          {/* In-app warning */}
          {inAppBrowserWarning && !hasWallet && walletLoginStep === 'idle' && (
            <div className="mb-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-2 text-center w-full">
              <p className="text-[10px] text-yellow-400">In-app browser detected. Open in Safari/Chrome for Google.</p>
            </div>
          )}

          {/* OTP */}
          {waitingForOtp && (
            <div className="mb-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 p-2 text-center animate-pulse w-full">
              <p className="text-xs text-cyan-400">Check email for code</p>
            </div>
          )}

          {/* OAuth + Email */}
          {walletLoginStep === 'idle' && (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <GoogleButton />
                <DiscordButton />
                <TwitchButton />
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-600 text-[10px]">OR</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              <LoginForm handleMagicLogin={handleSubmit} disabled={waitingForOtp} />
            </div>
          )}
        </ContentContainer>
      </div>
    </>
  );
}
