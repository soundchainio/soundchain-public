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

      // Use popup instead of redirect - redirect not working with network config
      console.log('[OAuth] Using popup for', provider);

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
      setError(error.message || `${provider} login failed. Please try again.`);
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
          <div className="mb-2 flex h-36 items-center justify-center">
            <LogoAndText className="text-white filter drop-shadow-lg" />
          </div>
          {/* Error display */}
          {error && (
            <div className="mb-4 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500 text-center text-sm text-red-400 font-semibold">
              {error}
            </div>
          )}

          {/* In-app browser warning */}
          {inAppBrowserWarning && !hasWallet && (
            <div className="mb-4 rounded-lg bg-yellow-500/20 border border-yellow-500 p-4 text-center">
              <p className="text-sm font-semibold text-yellow-400">
                You're using an in-app browser
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                For Google login, tap ⋮ menu → "Open in Safari/Chrome"
              </p>
            </div>
          )}

          {/* OTP waiting indicator */}
          {waitingForOtp && (
            <div className="mb-4 rounded-lg bg-cyan-500/20 border border-cyan-500 p-4 text-center animate-pulse">
              <p className="text-sm font-semibold text-cyan-400">
                Check your email for a 6-digit code
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              🔥 WALLET LOGIN - FIRST CLASS, FRONT AND CENTER 🔥
              ═══════════════════════════════════════════════════════════════ */}
          {hasWallet && walletLoginStep !== 'success' && (
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-600/30 via-cyan-600/20 to-orange-500/20 border-2 border-purple-500/50 p-6 text-center shadow-2xl shadow-purple-500/20">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">{walletBrowserInfo.walletName === 'MetaMask' ? '🦊' : walletBrowserInfo.walletName === 'Coinbase Wallet' ? '🔵' : '💎'}</span>
                <div>
                  <p className="text-xl font-bold text-white">
                    {walletBrowserInfo.isWallet ? walletBrowserInfo.walletName : 'Web3 Wallet'} Ready
                  </p>
                  <p className="text-xs text-purple-300">Decentralized • Self-Custody • No Email Needed</p>
                </div>
              </div>

              {walletLoginStep === 'idle' && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* MetaMask / Injected Wallet */}
                    {hasWallet && (
                      <button
                        onClick={() => { setSelectedWalletType('metamask'); handleWalletLogin(); }}
                        className="py-3 px-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/50 hover:border-orange-400 rounded-xl text-white font-medium transition-all hover:scale-[1.02] flex flex-col items-center gap-2"
                      >
                        <span className="text-2xl">🦊</span>
                        <span className="text-sm">{walletBrowserInfo.walletName || 'MetaMask'}</span>
                      </button>
                    )}

                    {/* WalletConnect - Trust, Rainbow, etc. */}
                    <button
                      onClick={handleWalletConnectLogin}
                      disabled={!isWeb3ModalReady}
                      className={`py-3 px-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${
                        isWeb3ModalReady
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-600/10 border border-blue-500/50 hover:border-blue-400 text-white hover:scale-[1.02]'
                          : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-wait'
                      }`}
                    >
                      <span className="text-2xl">🔗</span>
                      <span className="text-sm">{isWeb3ModalReady ? 'WalletConnect' : 'Loading...'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    WalletConnect supports <span className="text-blue-400">Trust</span>, <span className="text-purple-400">Rainbow</span>, <span className="text-green-400">Ledger</span> + 300 more
                  </p>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Sign a message to verify ownership • Zero gas fees • Instant access
                  </p>
                </>
              )}

              {walletLoginStep === 'connecting' && (
                <div className="py-4">
                  <div className="animate-spin w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-purple-300 font-medium text-lg">Connecting...</p>
                  <p className="text-xs text-gray-400 mt-1">Approve in your wallet</p>
                </div>
              )}

              {walletLoginStep === 'checking' && (
                <div className="py-4">
                  <div className="animate-spin w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-cyan-300 font-medium text-lg">Checking account...</p>
                  <p className="text-sm text-white mt-2 font-mono bg-black/30 rounded-lg py-2 px-3">
                    {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                  </p>
                </div>
              )}

              {/* NEW USER REGISTRATION FORM */}
              {walletLoginStep === 'register' && (
                <form onSubmit={handleWalletRegistration} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-green-400 font-bold text-lg">🎉 Welcome to SoundChain!</p>
                    <p className="text-sm text-white mt-1 font-mono bg-black/30 rounded-lg py-2 px-3 inline-block">
                      {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Create your account to get started</p>
                  </div>

                  <div>
                    <label className="text-xs text-purple-300 font-medium mb-1 block">Display Name</label>
                    <input
                      type="text"
                      value={walletDisplayName}
                      onChange={(e) => setWalletDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-purple-300 font-medium mb-1 block">Username *</label>
                    <input
                      type="text"
                      value={walletHandle}
                      onChange={(e) => setWalletHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      placeholder="username"
                      maxLength={24}
                      className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Letters and numbers only, max 24 chars</p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                    <input
                      type="checkbox"
                      id="walletTerms"
                      checked={walletTermsAccepted}
                      onChange={(e) => setWalletTermsAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-cyan-500 bg-black text-cyan-500"
                    />
                    <label htmlFor="walletTerms" className="text-xs text-gray-400">
                      I agree to SoundChain's{' '}
                      <a href="/terms-and-conditions" className="text-cyan-400 hover:underline" target="_blank">
                        Terms & Conditions
                      </a>{' '}
                      and{' '}
                      <a href="/privacy-policy" className="text-cyan-400 hover:underline" target="_blank">
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!walletHandle.trim() || !walletTermsAccepted}
                    className={`w-full py-4 px-6 rounded-xl text-lg font-bold transition-all ${
                      walletHandle.trim() && walletTermsAccepted
                        ? 'bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    ✍️ Sign & Create Account
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWalletLoginStep('idle'); setIsNewWalletUser(false); }}
                    className="w-full py-2 text-gray-500 hover:text-gray-400 text-sm"
                  >
                    ← Back
                  </button>
                </form>
              )}

              {walletLoginStep === 'signing' && (
                <div className="py-4">
                  <div className="animate-pulse text-5xl mb-3">✍️</div>
                  <p className="text-cyan-300 font-bold text-lg">Sign the Message</p>
                  <p className="text-sm text-white mt-2 font-mono bg-black/30 rounded-lg py-2 px-3">
                    {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                  </p>
                  <p className="text-xs text-purple-300 mt-3">
                    Check your wallet for the signature request
                  </p>
                </div>
              )}

              {walletLoginStep === 'error' && (
                <div className="py-2">
                  <button
                    onClick={() => { setWalletLoginStep('idle'); setError(null); setIsNewWalletUser(false); }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-lg font-bold rounded-xl transition-all"
                  >
                    🔄 Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Wallet login success state */}
          {walletLoginStep === 'success' && (
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-green-600/30 to-cyan-600/20 border-2 border-green-500/50 p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-green-400 font-bold text-xl">Wallet Verified!</p>
              <p className="text-sm text-white mt-2 font-mono">
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </p>
              <p className="text-xs text-gray-400 mt-3">Entering SoundChain...</p>
            </div>
          )}

          {/* Divider - only show if wallet available */}
          {hasWallet && walletLoginStep === 'idle' && (
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
              <span className="text-gray-500 text-xs font-medium">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            </div>
          )}

          {/* OAuth buttons - secondary option now */}
          {walletLoginStep === 'idle' && (
            <>
              <div className="flex flex-col gap-2 mt-2">
                <GoogleButton />
                <DiscordButton />
                <TwitchButton />
              </div>

              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                <span className="text-gray-500 text-xs font-medium">OR</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
              </div>

              <LoginForm handleMagicLogin={handleSubmit} disabled={waitingForOtp} />
            </>
          )}

          {/* No wallet message for users without wallets */}
          {!hasWallet && !inAppBrowserWarning && walletLoginStep === 'idle' && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                🦊 Have a wallet? Open in{' '}
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  MetaMask
                </a>
                {' '}or{' '}
                <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                  Coinbase Wallet
                </a>
                {' '}for instant Web3 login
              </p>
            </div>
          )}
        </ContentContainer>
      </div>
    </>
  );
}
