import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'components/common/Buttons/Button';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { FormValues, LoginForm } from 'components/LoginForm';
import SEO from 'components/SEO';
import { TopNavBarButton } from 'components/TopNavBarButton';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
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
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth2';

// Auth-only Magic instance (no network config - just for authentication)
const MAGIC_KEY = process.env.NEXT_PUBLIC_MAGIC_KEY || 'pk_live_858EC1BFF763F101';

// Create a single auth Magic instance - reuse across all login methods
let authMagicInstance: any = null;
const getAuthMagic = () => {
  if (typeof window === 'undefined') return null;
  if (!authMagicInstance) {
    authMagicInstance = new Magic(MAGIC_KEY, {
      extensions: [new OAuthExtension()],
    });
    console.log('[Auth] Created shared Magic auth instance');
  }
  return authMagicInstance;
};

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

export default function LoginPage() {
  const [login] = useLoginMutation();
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, loading: loadingMe } = useMeQuery({ skip: true });
  const me = data?.me;
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>();
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext();
  const [isClient, setIsClient] = useState(false);
  const [inAppBrowserWarning, setInAppBrowserWarning] = useState(false);
  const authMagic = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
    // Initialize auth Magic instance on client
    authMagic.current = getAuthMagic();
    // Detect in-app browser and warn user
    if (isInAppBrowser()) {
      setInAppBrowserWarning(true);
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

  useEffect(() => {
    const validateToken = async () => {
      // Skip validation if user is already in login process or not client-side
      if (loggingIn || !isClient || !authMagic.current) {
        console.log('[validateToken] Skipping - login in progress or not ready');
        return;
      }

      const storedToken = localStorage.getItem('didToken');
      if (storedToken) {
        try {
          // Use timeout to prevent hanging on isLoggedIn check
          const isLoggedInPromise = authMagic.current.user.isLoggedIn();
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
  }, [isClient, login, router, loggingIn]);

  const handleSocialLogin = async (provider: 'google' | 'discord' | 'twitch') => {
    console.log(`[OAuth2] handleSocialLogin called for ${provider}`);
    console.log('[OAuth2] Magic Public Key:', MAGIC_KEY?.substring(0, 15) + '...');

    try {
      // Check for in-app browser (Google blocks OAuth in these)
      if (isInAppBrowser()) {
        if (provider === 'google') {
          setError('Google login is blocked in this browser. Please open in Safari or Chrome, or use Email login.');
          return;
        }
        // Discord and Twitch may also have issues in in-app browsers
        console.warn('[OAuth2] In-app browser detected, OAuth may fail');
      }

      // Use shared auth Magic instance
      const magic = authMagic.current;
      if (!magic) {
        console.error('[OAuth2] Magic instance not initialized');
        setError('Login not ready. Please refresh the page and try again.');
        return;
      }

      setLoggingIn(true);
      setError(null);
      localStorage.removeItem('didToken');

      console.log('[OAuth2] Using shared auth Magic instance');
      console.log('[OAuth2] oauth2 extension available:', !!(magic as any).oauth2);
      console.log('[OAuth2] Window origin:', window.location.origin);

      if (!(magic as any).oauth2) {
        console.error('[OAuth2] oauth2 extension not available - SDK may not have loaded correctly');
        setError('OAuth not available. Please refresh the page and try again.');
        setLoggingIn(false);
        return;
      }

      // Wait for Magic iframe to preload with timeout (prevent infinite hang)
      console.log('[OAuth2] Waiting for Magic iframe preload...');
      try {
        const preloadPromise = (magic as any).preload();
        const preloadTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Preload timeout')), 8000)
        );
        await Promise.race([preloadPromise, preloadTimeout]);
        console.log('[OAuth2] Magic preload complete');
      } catch (preloadErr: any) {
        console.warn('[OAuth2] Preload warning:', preloadErr?.message || preloadErr);
        // Continue anyway - preload failures don't always mean OAuth will fail
        // If preload times out, we'll still try the OAuth redirect
      }

      // Build redirect URI - MUST match exactly what's in Magic Dashboard
      // Use config.domainUrl for consistency with legacy code (falls back to origin if not set)
      const redirectURI = `${config.domainUrl || window.location.origin}/login`;
      console.log('[OAuth2] Starting OAuth for:', provider);
      console.log('[OAuth2] Redirect URI:', redirectURI);
      console.log('[OAuth2] NOTE: This redirect URI must be configured in Magic Dashboard');

      // Set a timeout - if redirect doesn't happen within 10 seconds, something is wrong
      const redirectTimeout = setTimeout(() => {
        console.error('[OAuth2] ⚠️ Redirect timeout!');
        console.error('[OAuth2] Possible causes:');
        console.error('  1. Magic iframe failed to load (check CSP headers)');
        console.error('  2. OAuth provider not configured in Magic Dashboard');
        console.error('  3. Redirect URI mismatch between code and Magic Dashboard');
        console.error('  4. Network/firewall blocking Magic SDK');
        setError(`${provider} login is taking too long. Please check your connection and try again.`);
        setLoggingIn(false);
      }, 10000);

      // Call loginWithRedirect - this should trigger browser navigation to provider
      console.log('[OAuth2] Calling loginWithRedirect...');
      try {
        await (magic as any).oauth2.loginWithRedirect({
          provider,
          redirectURI,
          scope: ['openid', 'email'],  // Required for proper identity claims and oauthProvider
        });
        // If we reach here, redirect didn't happen (unusual - usually throws or redirects)
        console.log('[OAuth2] loginWithRedirect returned without redirecting - this is unexpected');
        clearTimeout(redirectTimeout);
      } catch (redirectErr: any) {
        clearTimeout(redirectTimeout);
        console.error('[OAuth2] loginWithRedirect error:', redirectErr);
        console.error('[OAuth2] Error code:', redirectErr.code);
        console.error('[OAuth2] Error message:', redirectErr.message);

        const errorMsg = redirectErr.message?.toLowerCase() || '';

        if (errorMsg.includes('user denied') || errorMsg.includes('cancelled') || errorMsg.includes('user rejected')) {
          setError('Login cancelled. Please try again.');
        } else if (errorMsg.includes('not configured') || errorMsg.includes('provider')) {
          setError(`${provider} login is not configured. Please contact support or use Email login.`);
        } else if (errorMsg.includes('popup') || errorMsg.includes('blocked')) {
          setError('Popup blocked. Please allow popups for this site and try again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(redirectErr.message || `${provider} login failed. Please try again.`);
        }
        setLoggingIn(false);
      }
    } catch (error: any) {
      console.error('[OAuth2] Unexpected error:', error);
      setError(error.message || `${provider} login failed. Please try again or use Email login.`);
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleDiscordLogin = () => handleSocialLogin('discord');
  const handleTwitchLogin = () => handleSocialLogin('twitch');

  useEffect(() => {
    async function handleMagicLink() {
      const magic = authMagic.current;
      if (magic && magicParam && !loggingIn) {
        try {
          setLoggingIn(true);
          setError(null);
          console.log('[MagicLink] Processing magic_credential callback');
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
        } catch (error) {
          handleError(error as Error);
        } finally {
          setLoggingIn(false);
        }
      }
    }
    handleMagicLink();
  }, [isClient, magicParam, login, handleError, router]);

  // Handle OAuth2 redirect callback
  // Check for OAuth-related URL params that indicate a callback
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    async function handleOAuthRedirect() {
      // Skip if not client-side or already logging in
      if (!isClient || !authMagic.current) return;

      // Check if this looks like an OAuth callback by checking URL params
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      // Magic OAuth uses these params: magic_oauth_request_id, magic_credential, provider, state
      const hasOAuthParams = urlParams.has('magic_oauth_request_id') ||
                             urlParams.has('magic_credential') ||
                             urlParams.has('provider') ||
                             urlParams.has('state') ||
                             hashParams.has('access_token') ||
                             hashParams.has('state');

      console.log('[OAuth2] Checking for OAuth redirect...');
      console.log('[OAuth2] Current URL:', window.location.href);
      console.log('[OAuth2] Has OAuth params:', hasOAuthParams);

      // Only process if we have OAuth params - don't waste time on fresh page loads
      if (!hasOAuthParams) {
        console.log('[OAuth2] No OAuth params found, skipping getRedirectResult');
        return;
      }

      // Show loading state immediately when processing OAuth callback
      setIsProcessingOAuth(true);
      setLoggingIn(true);

      const magic = authMagic.current;

      try {
        console.log('[OAuth2] OAuth params detected, calling getRedirectResult...');

        // Add longer timeout for getRedirectResult (15 seconds)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OAuth processing timed out. Please try again.')), 15000)
        );

        const result = await Promise.race([
          (magic as any).oauth2.getRedirectResult(),
          timeoutPromise
        ]);
        console.log('[OAuth2] getRedirectResult returned:', result);

        if (result && result.magic?.idToken) {
          console.log('[OAuth2] Got OAuth result with idToken!');
          console.log('[OAuth2] OAuth provider info:', {
            provider: result.oauth?.provider,
            email: result.oauth?.userInfo?.email,
            userInfo: result.oauth?.userInfo,
          });

          try {
            const didToken = result.magic.idToken;
            localStorage.setItem('didToken', didToken);

            const loginResult = await login({ variables: { input: { token: didToken } } });
            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              await new Promise(resolve => setTimeout(resolve, 200));
              const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
              router.push(redirectUrl);
              return; // Success - exit early
            } else {
              throw new Error('Login failed: No JWT returned from server');
            }
          } catch (loginErr: any) {
            console.error('[OAuth2] Login mutation failed:', loginErr);
            // Check for "already exists" which means user needs to login with different method
            if (loginErr.message?.includes('already exists')) {
              const authMethodFromError = loginErr.graphQLErrors?.find((err: any) => err.extensions?.with)?.extensions?.with;
              if (authMethodFromError) {
                setAuthMethod([authMethodFromError]);
              }
            } else if (loginErr.message?.includes('invalid credentials') || loginErr.message?.includes('Invalid credentials')) {
              // User doesn't exist, redirect to create account
              router.push('/create-account');
              return;
            }
            setError(loginErr.message || 'Login failed after Google authentication');
          }
        } else {
          console.log('[OAuth2] getRedirectResult returned empty result');
          setError('Google login did not complete. Please try again.');
        }
      } catch (error: any) {
        console.error('[OAuth2] OAuth callback error:', error);
        const errorMsg = error?.message || '';

        if (errorMsg.includes('timed out')) {
          setError('Login timed out. Please check your connection and try again.');
        } else if (errorMsg.includes('user denied') || errorMsg.includes('cancelled') || errorMsg.includes('User denied')) {
          setError('Login was cancelled. Please try again.');
        } else if (errorMsg.includes('popup') || errorMsg.includes('blocked')) {
          setError('Popup was blocked. Please allow popups and try again.');
        } else {
          setError(errorMsg || 'Google login failed. Please try again.');
        }
      } finally {
        setIsProcessingOAuth(false);
        setLoggingIn(false);
        // Clean up URL params after processing
        if (hasOAuthParams) {
          window.history.replaceState({}, '', '/login');
        }
      }
    }

    // Run after a short delay to ensure Magic SDK is ready
    // Use requestIdleCallback if available for better performance
    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(() => handleOAuthRedirect(), { timeout: 500 });
      return () => cancelIdleCallback(idleId);
    } else {
      const timeoutId = setTimeout(handleOAuthRedirect, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isClient, login, router]);

  async function handleSubmit(values: FormValues) {
    try {
      const magic = authMagic.current;
      if (!magic) throw new Error('Magic SDK not initialized. Please refresh the page.');
      console.log('[Email] Starting login process for email:', values.email);
      setLoggingIn(true);
      setError(null);

      // Use Email OTP - user gets a 6-digit code in email, enters it in Magic's UI
      // This is simpler than magic links - no redirects, works reliably across all browsers
      console.log('[Email] Sending OTP code to email...');

      const didToken = await magic.auth.loginWithEmailOTP({
        email: values.email,
      });

      console.log('[Email] OTP authentication completed!');
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

  if (loggingIn) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex h-full w-full flex-col items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
          <span className="text-white ml-2 mt-4">
            {isProcessingOAuth ? 'Processing Google login...' : 'Logging in...'}
          </span>
          {isProcessingOAuth && (
            <span className="text-gray-400 text-sm mt-2">
              Please wait, this may take a few seconds
            </span>
          )}
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
          {error && (
            <div className="py-4 text-center text-sm text-red-500 font-semibold drop-shadow-md">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <GoogleButton />
            <DiscordButton />
            <TwitchButton />
          </div>
          <div className="py-7 text-center text-sm font-bold text-gray-50 drop-shadow-md">OR</div>
          <LoginForm handleMagicLogin={handleSubmit} />
        </ContentContainer>
      </div>
    </>
  );
}
