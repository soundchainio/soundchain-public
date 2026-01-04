import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'components/common/Buttons/Button';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { FormValues, LoginForm } from 'components/LoginForm';
import SEO from 'components/SEO';
import { TopNavBarButton } from 'components/TopNavBarButton';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMagicContext } from 'hooks/useMagicContext';
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
  const { magic } = useMagicContext();
  const [isClient, setIsClient] = useState(false);
  const [inAppBrowserWarning, setInAppBrowserWarning] = useState(false);

  useEffect(() => {
    setIsClient(true);
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

  // Legacy-style OAuth handlers (matching working develop/staging branches)
  const handleGoogleLogin = async () => {
    if (!magic) {
      setError('Login not ready. Please refresh the page.');
      return;
    }
    // Check for in-app browser (Google blocks OAuth in these)
    if (isInAppBrowser()) {
      setError('Google login is blocked in this browser. Please open in Safari or Chrome, or use Email login.');
      return;
    }
    try {
      setLoggingIn(true);
      await (magic as any).oauth2.loginWithRedirect({
        provider: 'google',
        redirectURI: `${config.domainUrl}/login`,
        scope: ['openid'],
      });
    } catch (err: any) {
      console.error('[OAuth] Google redirect error:', err);
      setError(err.message || 'Google login failed');
      setLoggingIn(false);
    }
  };

  const handleDiscordLogin = async () => {
    if (!magic) {
      setError('Login not ready. Please refresh the page.');
      return;
    }
    try {
      setLoggingIn(true);
      await (magic as any).oauth2.loginWithRedirect({
        provider: 'discord',
        redirectURI: `${config.domainUrl}/login`,
        scope: ['openid'],
      });
    } catch (err: any) {
      console.error('[OAuth] Discord redirect error:', err);
      setError(err.message || 'Discord login failed');
      setLoggingIn(false);
    }
  };

  const handleTwitchLogin = async () => {
    if (!magic) {
      setError('Login not ready. Please refresh the page.');
      return;
    }
    try {
      setLoggingIn(true);
      await (magic as any).oauth2.loginWithRedirect({
        provider: 'twitch',
        redirectURI: `${config.domainUrl}/login`,
        scope: ['openid'],
      });
    } catch (err: any) {
      console.error('[OAuth] Twitch redirect error:', err);
      setError(err.message || 'Twitch login failed');
      setLoggingIn(false);
    }
  };

  // Legacy-style OAuth callback handler (matching working develop/staging branches)
  useEffect(() => {
    async function handleOAuthCallback() {
      // Wait for router to be ready before checking query params
      if (!router.isReady) return;
      if (magic && router.query.magic_credential) {
        console.log('[OAuth] Detected magic_credential, processing callback...');
        console.log('[OAuth] Full URL:', window.location.href);
        setLoggingIn(true);
        setError(null);

        try {
          console.log('[OAuth] Calling getRedirectResult()...');

          // Add 30s timeout to prevent infinite hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OAuth timeout - getRedirectResult took too long')), 30000)
          );

          const result = await Promise.race([
            (magic as any).oauth2.getRedirectResult(),
            timeoutPromise
          ]) as any;

          console.log('[OAuth] Got result:', result);

          if (result?.magic?.idToken) {
            console.log('[OAuth] Got idToken, logging in...');
            const loginResult = await login({ variables: { input: { token: result.magic.idToken } } });

            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
              console.log('[OAuth] Success! Redirecting to:', redirectUrl);
              router.push(redirectUrl);
            } else {
              throw new Error('No JWT returned from server');
            }
          } else {
            throw new Error('No idToken in OAuth result');
          }
        } catch (err: any) {
          console.error('[OAuth] Callback error:', err);
          setError(err.message || 'Google login failed. Please try again.');
          setLoggingIn(false);
        }
      }
    }
    handleOAuthCallback();
  }, [magic, router.isReady, router.query.magic_credential, login, router]);

  async function handleSubmit(values: FormValues) {
    try {
      if (!magic) throw new Error('Magic SDK not initialized. Please refresh the page.');
      console.log('[Email] Starting login process for email:', values.email);
      setLoggingIn(true);
      setError(null);

      // Use Email OTP - shows modal with 6-digit code input
      console.log('[Email] Sending OTP code to email...');

      // Keep loading spinner visible while Magic loads
      // Magic's OTP modal will appear on top

      let didToken: string;

      // Create a timeout promise for OTP (30 seconds - user needs time to enter code)
      const otpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OTP_TIMEOUT')), 30000)
      );

      try {
        // Try OTP first (better UX when it works)
        didToken = await Promise.race([
          magic.auth.loginWithEmailOTP({ email: values.email }),
          otpTimeout,
        ]);
      } catch (otpError: any) {
        if (otpError.message === 'OTP_TIMEOUT') {
          // OTP modal likely blocked - fall back to magic link
          console.log('[Email] OTP timed out, trying magic link fallback');
          setError('OTP modal blocked. Sending login link to your email instead...');
          didToken = await magic.auth.loginWithMagicLink({
            email: values.email,
            showUI: true,
          });
        } else {
          throw otpError;
        }
      }

      // OTP complete - now show our loader while processing
      setLoggingIn(true);

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
