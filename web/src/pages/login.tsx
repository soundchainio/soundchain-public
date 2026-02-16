import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import { CREATE_HD_ACCOUNT_MUTATION } from 'lib/graphql/mutations';
import { useRouter } from 'next/router';
import { isApolloError, useMutation } from '@apollo/client';
import styled from 'styled-components';

// Detect in-app browsers that Google blocks for OAuth
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
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

export default function LoginPage() {
  const [login] = useLoginMutation();
  const [loggingIn, setLoggingIn] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, loading: loadingMe } = useMeQuery({ skip: true });
  const me = data?.me;
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>();
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext();
  const { magic } = useMagicContext();
  const isProcessingCredential = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const [inAppBrowserWarning, setInAppBrowserWarning] = useState(false);

  // Login mode: 'login' (existing) or 'create' (new HD wallet account)
  const [loginMode, setLoginMode] = useState<'login' | 'create'>('login');

  // Create Account (HD wallet) state
  const [createEmail, setCreateEmail] = useState('');
  const [createHandle, setCreateHandle] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createTermsAccepted, setCreateTermsAccepted] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createdWalletAddress, setCreatedWalletAddress] = useState<string | null>(null);
  const [createHdAccountMutation] = useMutation(CREATE_HD_ACCOUNT_MUTATION);

  useEffect(() => {
    setIsClient(true);
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
      } else {
        setError(error.message || 'An unexpected error occurred during login');
      }
    },
    [],
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
      if (loggingIn || !isClient || !magic) {
        return;
      }

      const storedToken = localStorage.getItem('didToken');
      if (storedToken) {
        try {
          const isLoggedInPromise = magic.user.isLoggedIn();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('isLoggedIn timeout')), 5000)
          );

          const isLoggedIn = await Promise.race([isLoggedInPromise, timeoutPromise]);
          if (isLoggedIn) {
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
        } catch (error: any) {
          if (!error.message?.includes('timeout')) {
            localStorage.removeItem('didToken');
          }
        }
      }
    };
    validateToken();
  }, [isClient, login, router, loggingIn, magic]);

  const handleSocialLogin = async (provider: 'google' | 'discord' | 'twitch') => {
    try {
      if (isInAppBrowser() && provider === 'google') {
        setError('Google login is blocked in this browser. Please open in Safari or Chrome, or use Email login.');
        return;
      }

      if (!magic) {
        setError('Login not ready. Please refresh the page and try again.');
        return;
      }

      if (!(magic as any).oauth2) {
        setError('OAuth not available. Please refresh the page and try again.');
        return;
      }

      setLoggingIn(true);
      setError(null);
      localStorage.removeItem('didToken');

      const result = await (magic as any).oauth2.loginWithPopup({
        provider,
        scope: ['openid'],
      });

      let idToken = result?.magic?.idToken;

      if (!idToken) {
        try {
          const isLoggedIn = await magic.user.isLoggedIn();
          if (isLoggedIn) {
            idToken = await magic.user.getIdToken();
          }
        } catch (fallbackErr: any) {
          console.log('[OAuth] Fallback token fetch failed:', fallbackErr?.message);
        }
      }

      if (idToken) {
        const loginResult = await login({ variables: { input: { token: idToken } } });
        if (loginResult.data?.login.jwt) {
          await setJwt(loginResult.data.login.jwt);
          localStorage.setItem('didToken', idToken);
          const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
          router.push(redirectUrl);
          return;
        }
      }

      throw new Error('OAuth login failed - no token received');
    } catch (error: any) {
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

  // Handle HD wallet account creation
  const handleCreateHdAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!createHandle.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!createTermsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setCreateLoading(true);

    try {
      const { data } = await createHdAccountMutation({
        variables: {
          input: {
            email: createEmail.trim().toLowerCase(),
            handle: createHandle.trim(),
            displayName: createDisplayName.trim() || undefined,
          },
        },
      });

      if (data?.createHdAccount?.jwt) {
        const { jwt, hdWalletAddress } = data.createHdAccount;
        setCreatedWalletAddress(hdWalletAddress);
        await setJwt(jwt);

        setTimeout(() => {
          const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
          router.push(redirectUrl);
        }, 1500);
      } else {
        throw new Error('Account creation failed - no response from server');
      }
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Account creation failed. Please try again.';
      setError(message);
      setCreateLoading(false);
    }
  };

  // Handle magic_credential callbacks (OAuth and Email Magic Links)
  useEffect(() => {
    async function handleMagicCredential() {
      if (!magic || !magicParam || isProcessingCredential.current) {
        return;
      }

      isProcessingCredential.current = true;
      setLoggingIn(true);
      setError(null);

      try {
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
        } catch (err: any) {
          oauthError = err;
        }

        if (oauthResult?.magic?.idToken) {
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

        if (oauthError) {
          throw new Error(`Google login failed: ${oauthError.message}. Please try again.`);
        }

        // Try email magic link
        await magic.auth.loginWithCredential();
        const didToken = await magic.user.getIdToken();
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
      setError(null);

      setWaitingForOtp(true);

      let didToken: string;

      const otpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OTP_TIMEOUT')), 90000)
      );

      try {
        didToken = await Promise.race([
          magic.auth.loginWithEmailOTP({ email: values.email }),
          otpTimeout,
        ]);
      } catch (otpError: any) {
        setWaitingForOtp(false);

        if (otpError.message?.includes('User denied') || otpError.message?.includes('cancelled')) {
          setError(null);
          return;
        }

        if (otpError.message === 'OTP_TIMEOUT') {
          setError('OTP timed out. Sending a login link to your email instead...');

          try {
            setWaitingForOtp(true);
            didToken = await magic.auth.loginWithMagicLink({
              email: values.email,
              showUI: true,
            });
            setWaitingForOtp(false);
          } catch (magicLinkError: any) {
            setError('Failed to send login email. Please try again.');
            setWaitingForOtp(false);
            return;
          }
        } else {
          throw otpError;
        }
      }

      setWaitingForOtp(false);
      setLoggingIn(true);
      setError(null);

      localStorage.setItem('didToken', didToken);

      if (!didToken) {
        throw new Error('Error connecting Magic: No token returned');
      }

      const result = await login({ variables: { input: { token: didToken } } });

      if (result.data?.login.jwt) {
        await setJwt(result.data.login.jwt);
        await new Promise(resolve => setTimeout(resolve, 200));
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
      } else {
        throw new Error('Login failed: No JWT returned');
      }
    } catch (error: any) {
      setWaitingForOtp(false);
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

  // Full-screen loader after OTP/magic link completes
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
          {authMethod.includes(AuthMethod.MagicLink) && <LoginForm handleMagicLogin={handleSubmit} />}
          <div className="flex h-full flex-col justify-between">
            <div className="py-4 text-center text-sm text-white font-semibold">
              Or create a new account with the same email.
            </div>
            <button
              onClick={() => { setAuthMethod(undefined); setLoginMode('create'); }}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all"
            >
              CREATE NEW ACCOUNT
            </button>
          </div>
        </ContentContainer>
      </>
    );
  }

  return (
    <>
      <SEO title="Login | SoundChain" description="Log in to SoundChain" canonicalUrl="/login/" />
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
        {/* Background GIF */}
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
          {/* ========== CREATE ACCOUNT (HD Wallet) ========== */}
          {loginMode === 'create' && !createdWalletAddress && (
            <div className="w-full rounded-xl bg-black/40 border border-cyan-500/30 p-4 backdrop-blur-sm">
              <div className="text-center mb-3">
                <p className="text-sm font-semibold text-white">Create Your Account</p>
                <p className="text-[10px] text-cyan-300 mt-0.5">Multi-chain HD wallet generated automatically</p>
              </div>

              {error && (
                <div className="mb-3 py-2 px-3 rounded-md bg-red-500/20 border border-red-500/50 text-center text-xs text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateHdAccount} className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Email *</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                    disabled={createLoading}
                  />
                  <p className="text-[9px] text-gray-600 mt-0.5">Used for login - you'll use Email OTP to sign in</p>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Username *</label>
                  <input
                    type="text"
                    value={createHandle}
                    onChange={(e) => setCreateHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    maxLength={24}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Display Name</label>
                  <input
                    type="text"
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    placeholder="Your Name (optional)"
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                    disabled={createLoading}
                  />
                </div>

                <label className="flex items-start gap-2 text-[10px] text-gray-400 pt-1">
                  <input
                    type="checkbox"
                    checked={createTermsAccepted}
                    onChange={(e) => setCreateTermsAccepted(e.target.checked)}
                    className="h-3 w-3 mt-0.5 rounded border-cyan-500 bg-black text-cyan-500"
                    disabled={createLoading}
                  />
                  <span>
                    I agree to the <a href="/terms-and-conditions" className="text-cyan-400" target="_blank">Terms</a> & <a href="/privacy-policy" className="text-cyan-400" target="_blank">Privacy Policy</a>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!createEmail.trim() || !createHandle.trim() || !createTermsAccepted || createLoading}
                  className={`w-full py-2.5 rounded-md text-sm font-semibold transition-all ${
                    createEmail.trim() && createHandle.trim() && createTermsAccepted && !createLoading
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {createLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2 text-[9px] text-gray-500">
                  <span className="text-cyan-400">&#x2B21;</span>
                  <span>Your wallet works on Polygon, Ethereum, Base, Arbitrum & more</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1">
                  <span className="text-green-400">&#x2713;</span>
                  <span>No browser extension needed. No gas fees to create.</span>
                </div>
              </div>

              {/* Back to login */}
              <button
                onClick={() => { setLoginMode('login'); setError(null); }}
                className="w-full mt-3 text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                &#x2190; Back to Login
              </button>
            </div>
          )}

          {/* HD Account Created Success */}
          {createdWalletAddress && (
            <div className="w-full rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-center backdrop-blur-sm">
              <p className="text-green-400 font-semibold text-sm">Account Created!</p>
              <p className="text-[10px] text-gray-400 mt-1">Your HD Wallet</p>
              <p className="text-[10px] text-cyan-300 font-mono mt-0.5 break-all">{createdWalletAddress}</p>
              <div className="mt-3">
                <div className="animate-spin w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[10px] text-gray-400 mt-1">Redirecting to feed...</p>
              </div>
            </div>
          )}

          {/* ========== LOGIN (Google + Email OTP) ========== */}
          {loginMode === 'login' && (
            <>
              {/* Logo */}
              <div className="mb-4 flex h-12 items-center justify-center">
                <LogoAndText className="text-white h-8" />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-2 py-2 px-3 rounded-md bg-red-500/20 border border-red-500/50 text-center text-xs text-red-400 w-full">
                  {error}
                </div>
              )}

              {/* In-app warning */}
              {inAppBrowserWarning && (
                <div className="mb-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-2 text-center w-full">
                  <p className="text-[10px] text-yellow-400">In-app browser detected. Open in Safari/Chrome for Google.</p>
                </div>
              )}

              {/* OTP waiting indicator */}
              {waitingForOtp && (
                <div className="mb-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 p-2 text-center animate-pulse w-full">
                  <p className="text-xs text-cyan-400">Check email for code</p>
                </div>
              )}

              {/* Google OAuth */}
              <div className="w-full">
                <div className="mb-2">
                  <GoogleButton />
                </div>

                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-gray-600 text-[10px]">OR</span>
                  <div className="flex-1 h-px bg-gray-700"></div>
                </div>

                {/* Email OTP */}
                <LoginForm handleMagicLogin={handleSubmit} disabled={waitingForOtp} />

                {/* Create Account link */}
                <div className="mt-4 text-center">
                  <p className="text-[10px] text-gray-500 mb-1">New to SoundChain?</p>
                  <button
                    onClick={() => { setLoginMode('create'); setError(null); }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </>
          )}
        </ContentContainer>
      </div>
    </>
  );
}
