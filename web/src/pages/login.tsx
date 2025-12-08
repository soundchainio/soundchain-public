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
import { LeftArrow } from 'icons/LeftArrow';
import { LogoAndText } from 'icons/LogoAndText';
import { UserWarning } from 'icons/UserWarning';
import { setJwt } from 'lib/apollo';
import { AuthMethod, useLoginMutation, useMeQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { isApolloError } from '@apollo/client';
import styled from 'styled-components';

// Note: OAuth2 uses popup flow, no longer need to capture redirect params

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
  const { magic } = useMagicContext();
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>();
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext();
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
      // Skip validation if user is already in login process
      if (loggingIn) {
        console.log('[validateToken] Skipping - login in progress');
        return;
      }

      const storedToken = localStorage.getItem('didToken');
      if (storedToken && magic) {
        try {
          const isLoggedIn = await magic.user.isLoggedIn();
          if (isLoggedIn) {
            console.log('Validated stored didToken:', storedToken);
            const loginResult = await login({ variables: { input: { token: storedToken } } });
            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              await new Promise(resolve => setTimeout(resolve, 200));
              const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
              router.push(redirectUrl);
            }
          } else {
            localStorage.removeItem('didToken');
          }
        } catch (error) {
          console.error('Token validation error:', error);
          localStorage.removeItem('didToken');
        }
      }
    };
    validateToken();
  }, [magic, login, router, loggingIn]);

  const handleGoogleLogin = async () => {
    console.log('[OAuth2] handleGoogleLogin called');

    try {
      // Check for in-app browser and warn user
      if (isInAppBrowser()) {
        setError('Google login is blocked in this browser. Please open SoundChain in Safari or Chrome by tapping the menu (⋮ or ⋯) and selecting "Open in Browser".');
        return;
      }

      if (!magic) {
        console.error('[OAuth2] Magic not initialized');
        throw new Error('Magic SDK not initialized');
      }

      console.log('[OAuth2] Magic SDK ready, starting OAuth...');
      setLoggingIn(true);
      setError(null);

      // Clear localStorage token
      localStorage.removeItem('didToken');

      console.log('[OAuth2] Using loginWithPopup...');

      // Add timeout to detect hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OAuth popup timed out after 60s')), 60000);
      });

      // Try popup flow - it may work when redirect doesn't
      const result = await Promise.race([
        (magic as any).oauth2.loginWithPopup({
          provider: 'google',
          scope: 'openid email profile',
        }),
        timeoutPromise
      ]) as any;

      console.log('[OAuth2] loginWithPopup result:', result);

      if (result?.magic?.idToken) {
        const didToken = result.magic.idToken;
        console.log('[OAuth2] Got didToken from popup');
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
      } else {
        throw new Error('OAuth popup did not return a token');
      }
    } catch (error: any) {
      console.error('[OAuth2] Google login error:', error);
      if (error?.message?.includes('timed out')) {
        setError('Google login timed out. Please check your Magic Dashboard OAuth settings.');
      } else if (error?.message?.includes('popup')) {
        setError('Popup was blocked or closed. Please allow popups for this site.');
      } else {
        handleError(error as Error);
      }
      setLoggingIn(false);
    }
  };

  useEffect(() => {
    async function handleMagicLink() {
      if (magic && magicParam && !loggingIn) {
        try {
          setLoggingIn(true);
          setError(null);
          await magic.auth.loginWithCredential();
          const didToken = await magic.user.getIdToken();
          console.log('Received didToken (credential):', didToken); // Added logging
          localStorage.setItem('didToken', didToken); // Persist token
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
  }, [magic, magicParam, login, handleError]);

  // Handle OAuth2 redirect callback
  useEffect(() => {
    async function handleOAuthRedirect() {
      // Log current URL for debugging
      console.log('[OAuth2] Current URL:', window.location.href);
      console.log('[OAuth2] Search params:', window.location.search);

      if (!magic) {
        console.log('[OAuth2] Magic not ready yet');
        return;
      }

      // Check if URL has OAuth params
      const params = new URLSearchParams(window.location.search);
      const hasOAuthParams = params.has('code') || params.has('state') || params.has('magic_credential');

      console.log('[OAuth2] Has OAuth params:', hasOAuthParams, {
        code: params.has('code'),
        state: params.has('state'),
        magic_credential: params.has('magic_credential')
      });

      if (!hasOAuthParams) return;

      console.log('[OAuth2] Detected OAuth redirect params, processing...');
      setLoggingIn(true);

      try {
        const result = await (magic as any).oauth2.getRedirectResult();
        console.log('[OAuth2] getRedirectResult:', result);

        if (result && result.magic?.idToken) {
          const didToken = result.magic.idToken;
          console.log('[OAuth2] Got didToken from redirect');
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
        }
      } catch (error: any) {
        console.error('[OAuth2] Redirect error:', error);
        // Ignore "not an OAuth redirect" errors
        if (!error?.message?.includes('Missing') && !error?.message?.includes('OAuth')) {
          handleError(error as Error);
        }
        setLoggingIn(false);
      }
    }
    handleOAuthRedirect();
  }, [magic, login, router, handleError]);

  async function handleSubmit(values: FormValues) {
    try {
      if (!magic) throw new Error('Magic SDK not initialized');
      console.log('Starting login process for email:', values.email);
      setLoggingIn(true);
      setError(null);

      // Send magic link to email - user clicks link to complete login (no code pasting needed!)
      // This is better UX than OTP - user just clicks the email link and is auto-logged in
      // Use actual browser origin to handle both www and non-www domains
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : (config.domainUrl || 'https://soundchain.io');
      const redirectURI = `${baseUrl}/login`;
      console.log("Sending magic link to email...", { email: values.email, redirectURI });
      await magic.auth.loginWithMagicLink({
        email: values.email,
        redirectURI,  // Must match Magic dashboard allowed URLs
        showUI: true  // Show "check your email" UI
      });

      // After user clicks the email link and returns, get the token
      const didToken = await magic.user.getIdToken();
      console.log('Received didToken (magic link):', didToken);
      localStorage.setItem('didToken', didToken);

      if (!didToken) {
        throw new Error('Error connecting Magic: No token returned');
      }

      const result = await login({ variables: { input: { token: didToken } } });
      console.log('GraphQL login mutation result:', result);

      if (result.data?.login.jwt) {
        // Wait for JWT to be fully set before redirecting
        await setJwt(result.data.login.jwt);

        // Additional delay to ensure Apollo cache is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        console.log('Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } else {
        throw new Error('Login failed: No JWT returned');
      }
    } catch (error) {
      console.error('Login error:', error);
      handleError(error as Error);
      setLoggingIn(false);
    }
  }

  const GoogleButton = () => (
    <HoverableButton
      className="flex gap-2 rounded border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-4 text-sm font-semibold text-white"
      onClick={handleGoogleLogin}
    >
      <Google className="mr-1 h-5 w-5" />
      <span>Login with Google</span>
    </HoverableButton>
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
        <div className="flex h-full w-full items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
          <span className="text-white">Logging in</span>
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
          <GoogleButton />
          <div className="py-7 text-center text-sm font-bold text-gray-50 drop-shadow-md">OR</div>
          <LoginForm handleMagicLogin={handleSubmit} />
        </ContentContainer>
      </div>
    </>
  );
}
