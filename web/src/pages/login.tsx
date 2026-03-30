import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { OAuthExtension as OAuth2Extension } from '@magic-ext/oauth2';
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
import {
  CREATE_HD_ACCOUNT_MUTATION,
  LOGIN_BY_EMAIL_MUTATION,
  PASSKEY_LOGIN_OPTIONS_MUTATION,
  PASSKEY_LOGIN_VERIFY_MUTATION,
  PASSKEY_REGISTER_OPTIONS_MUTATION,
  PASSKEY_REGISTER_VERIFY_MUTATION,
} from 'lib/graphql/mutations';
import { useRouter } from 'next/router';
import { isApolloError, useMutation, useApolloClient, gql } from '@apollo/client';
import styled from 'styled-components';

// Lightweight query to get logged-in user's email for Face ID gate
const ME_EMAIL_QUERY = gql`query MeEmailForGate { me { email } }`;

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

// Detect Safari (iOS + macOS) — Magic OTP iframes broken by Safari ITP
function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|Opera/i.test(ua);
}

// Detect mobile Safari specifically — stricter ITP than desktop Safari
function isMobileSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return isSafariBrowser() && /iPhone|iPad|iPod/i.test(ua);
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
  const client = useApolloClient();
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
  const [accountCreated, setAccountCreated] = useState(false);
  const [createHdAccountMutation] = useMutation(CREATE_HD_ACCOUNT_MUTATION);

  // EmailKey state (email-gated WebAuthn biometric login)
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [emailKeyAccounts, setEmailKeyAccounts] = useState<string[]>([]);
  const [emailKeyBookUnlocked, setEmailKeyBookUnlocked] = useState(false);
  const [pendingEmailKeyEmail, setPendingEmailKeyEmail] = useState<string | null>(null);
  const [pendingForceEmail, setPendingForceEmail] = useState<string | null>(null);
  const [loginByEmailMutation] = useMutation(LOGIN_BY_EMAIL_MUTATION);
  const [passkeyLoginOptionsMutation] = useMutation(PASSKEY_LOGIN_OPTIONS_MUTATION);
  const [passkeyLoginVerifyMutation] = useMutation(PASSKEY_LOGIN_VERIFY_MUTATION);
  const [passkeyRegisterOptionsMutation] = useMutation(PASSKEY_REGISTER_OPTIONS_MUTATION);
  const [passkeyRegisterVerifyMutation] = useMutation(PASSKEY_REGISTER_VERIFY_MUTATION);


  useEffect(() => {
    setIsClient(true);
    if (isInAppBrowser()) {
      setInAppBrowserWarning(true);
    }
    // Clear stale Magic token on login page mount.
    // Prevents SERVICE_ERROR on mobile Safari where a leftover didToken
    // triggers Magic iframe communication that ITP blocks.
    localStorage.removeItem('didToken');

    // Check if WebAuthn / EmailKeys are available on this device
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setPasskeyAvailable(available))
        .catch(() => setPasskeyAvailable(false));
    }

    // Load EmailKey Book from localStorage
    try {
      const saved = localStorage.getItem('emailkey_accounts');
      if (saved) {
        const accounts = JSON.parse(saved);
        if (Array.isArray(accounts) && accounts.length > 0) {
          setEmailKeyAccounts(accounts);
        }
      }
    } catch (_) {}
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
      } else if (error.message?.includes('SERVICE_ERROR')) {
        // Magic Admin SDK SERVICE_ERROR — token validation failed on backend.
        // On mobile Safari, ITP can corrupt the token during iframe communication.
        setError('Email login is temporarily unavailable on this device. Please use Google login.');
      } else {
        setError(error.message || 'An unexpected error occurred during login');
      }
    },
    [],
  );

  // Track passkeyAvailable in a ref so async functions always read the latest value
  const passkeyAvailableRef = useRef(passkeyAvailable);
  passkeyAvailableRef.current = passkeyAvailable;
  const emailKeyAccountsRef = useRef(emailKeyAccounts);
  emailKeyAccountsRef.current = emailKeyAccounts;

  // Centralized post-login redirect — checks Face ID gate before allowing access
  // isOAuth: true for Google/Discord/Twitch — these already have their own 2FA,
  // so Face ID gate is skipped. Email-only login gets the mandatory gate.
  async function handlePostLoginRedirect(knownEmail?: string, isOAuth?: boolean) {
    console.log('[FaceID Gate] START — knownEmail:', knownEmail, 'isOAuth:', isOAuth);

    // OAuth logins (Google, Discord, Twitch) already have their own security
    // (Google password + 2FA, etc.) — skip the mandatory Face ID gate
    if (isOAuth) {
      const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
      console.log('[FaceID Gate] OAuth login — skipping gate, redirect to:', redirectUrl);
      router.push(redirectUrl);
      return;
    }

    let emailToCheck = knownEmail?.toLowerCase().trim();

    // If email unknown, fetch from server
    if (!emailToCheck) {
      try {
        console.log('[FaceID Gate] No email passed, querying server...');
        const { data: meData } = await client.query({
          query: ME_EMAIL_QUERY,
          fetchPolicy: 'network-only',
        });
        emailToCheck = meData?.me?.email?.toLowerCase();
        console.log('[FaceID Gate] Server returned email:', emailToCheck);
      } catch (queryErr: any) {
        console.error('[FaceID Gate] ME_EMAIL_QUERY failed:', queryErr?.message);
      }
    }

    // Check WebAuthn availability directly — always do a fresh check
    let deviceSupportsPasskey = false;
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        deviceSupportsPasskey = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (_) {}
    }

    const currentAccounts = emailKeyAccountsRef.current;
    console.log('[FaceID Gate] DECISION:', {
      emailToCheck,
      deviceSupportsPasskey,
      currentAccounts,
      passkeyAvailableState: passkeyAvailable,
      willShowPrompt: !!(deviceSupportsPasskey && emailToCheck && !currentAccounts.includes(emailToCheck)),
    });

    // Force Face ID setup for email-only login if device supports it and email isn't secured
    if (deviceSupportsPasskey && emailToCheck && !currentAccounts.includes(emailToCheck)) {
      setPendingEmailKeyEmail(emailToCheck);
      setShowPasskeyPrompt(true);
      setLoggingIn(false);
      return;
    }

    const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
    console.log('[FaceID Gate] Redirecting to:', redirectUrl);
    router.push(redirectUrl);
  }

  useEffect(() => {
    setTopNavBarProps(authMethod ? topNavBarProps : { isLogin: true });
    setIsAuthLayout(true);
    return () => {
      setIsAuthLayout(false);
    };
  }, [setTopNavBarProps, setIsAuthLayout, authMethod, topNavBarProps]);

  // NOTE: useMeQuery has skip:true so `me` is always undefined — Face ID gate
  // is handled by handlePostLoginRedirect() called from each login path directly.

  useEffect(() => {
    const validateToken = async () => {
      if (loggingIn || !isClient || !magic) {
        return;
      }

      // Mobile Safari: Skip session validation entirely.
      // magic.user.isLoggedIn() uses Magic's iframe which ITP blocks,
      // causing SERVICE_ERROR that corrupts SDK state for subsequent calls.
      if (isMobileSafari()) {
        localStorage.removeItem('didToken');
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
              // Session restore = user already authenticated previously — skip Face ID gate
              await handlePostLoginRedirect(undefined, true);
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
        console.error('[OAuth] Magic not initialized');
        setError('Login not ready. Please refresh the page and try again.');
        return;
      }

      if (!(magic as any).oauth) {
        console.error('[OAuth] oauth extension missing');
        setError('OAuth not available. Please refresh the page and try again.');
        return;
      }

      setLoggingIn(true);
      setError(null);
      localStorage.removeItem('didToken');

      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (!isMobileDevice) {
        // DESKTOP: Use OAuth2 popup flow — avoids PKCE redirect issues caused by
        // MetaMask/Coinbase extensions clearing localStorage during page reload.
        // Creates a separate Magic instance WITHOUT network config (not needed for auth).
        console.log('[OAuth] Desktop popup flow for', provider);
        try {
          const { Magic: PopupMagic } = await import('magic-sdk');
          const popupMagic = new PopupMagic(process.env.NEXT_PUBLIC_MAGIC_KEY || 'pk_live_858EC1BFF763F101', {
            extensions: [new OAuth2Extension()],
          });
          const result = await (popupMagic as any).oauth2.loginWithPopup({
            provider,
            scope: ['openid', 'email', 'profile'],
          });
          if (result?.magic?.idToken) {
            const loginResult = await login({ variables: { input: { token: result.magic.idToken } } });
            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              localStorage.setItem('didToken', result.magic.idToken);
              await handlePostLoginRedirect(undefined, true);
              return;
            }
          }
          throw new Error('No token received from popup');
        } catch (popupErr: any) {
          console.error('[OAuth] Popup failed:', popupErr?.message);
          // If popup was blocked or user closed it, show friendly message
          if (popupErr?.message?.includes('user denied') || popupErr?.message?.includes('closed') || popupErr?.message?.includes('cancelled')) {
            throw new Error('Login popup was closed. Please try again.');
          }
          throw new Error(`${provider} login failed: ${popupErr?.message || 'Unknown error'}. Please try again.`);
        }
      }

      // MOBILE: Use redirect flow (popups are unreliable on mobile browsers)
      console.log('[OAuth] Mobile redirect flow for', provider);
      await (magic as any).oauth.loginWithRedirect({
        provider,
        redirectURI: `${window.location.origin}/login`,
        scope: ['openid'],
      });
      // User is redirected away — this code won't execute
      return;
    } catch (error: any) {
      console.error('[OAuth] Error:', error?.message, error);
      let userMessage = `${provider} login failed. Please try again.`;

      if (error.message?.includes('SERVER_ERROR') || error.message?.includes('500') || error.message?.includes('network')) {
        userMessage = `${provider} login temporarily unavailable. Try again in a moment, or use Email login.`;
      } else if (error.message?.includes('timeout')) {
        userMessage = `${provider} login timed out. Check your internet connection and try again.`;
      } else if (error.message?.includes('cancelled') || error.message?.includes('denied') || error.message?.includes('closed') || error.message?.includes('rejected')) {
        userMessage = 'Login was cancelled. Please try again.';
      }

      setError(userMessage);
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');

  // Handle EmailKey login — email-gated Face ID / Touch ID
  const handleEmailKeyLogin = async (email: string): Promise<boolean> => {
    try {
      setPasskeyLoading(true);
      setError(null);

      // Step 1: Check if this email has an EmailKey
      const { data: optData } = await passkeyLoginOptionsMutation({
        variables: { email },
      });

      if (!optData?.passkeyLoginOptions?.hasEmailKey) {
        return false; // No EmailKey — fall through to Magic
      }

      const { sessionId, options } = optData.passkeyLoginOptions;
      const parsedOptions = JSON.parse(options);

      // Step 2: Trigger Face ID / Touch ID (no QR code — specific credentials only)
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const credential = await startAuthentication({ optionsJSON: parsedOptions });

      // Step 3: Verify with server and get JWT
      setLoggingIn(true);
      const { data: verifyData } = await passkeyLoginVerifyMutation({
        variables: {
          input: {
            sessionId,
            credential: JSON.stringify(credential),
          },
        },
      });

      if (verifyData?.passkeyLoginVerify?.jwt) {
        await setJwt(verifyData.passkeyLoginVerify.jwt);
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
        return true; // EmailKey login succeeded — skip Magic
      }

      return false;
    } catch (err: any) {
      console.error('[EmailKey] Login error:', err);
      // User cancelled Face ID / Touch ID — not an error, fall through to other login methods
      if (err.name === 'NotAllowedError' || err.message?.includes('cancelled')) {
        setError(null);
      } else if (err.name === 'NotSupportedError' || err.message?.includes('not supported')) {
        // WebAuthn not supported on this browser — guide to Safari
        setError('Face ID login requires Safari on iOS. Open soundchain.io in Safari to use your EmailKey.');
      } else if (err.message?.includes('could not be verified') || err.message?.includes('verification required')) {
        // Touch ID / biometric failed on this device (e.g. Chrome Mac with Touch ID not configured)
        setError('Biometric login failed on this device. Try using Safari, or log in with Google.');
      }
      return false;
    } finally {
      setPasskeyLoading(false);
      setLoggingIn(false);
    }
  };

  // Handle EmailKey Book unlock — Face ID to reveal saved emails (privacy gate)
  // On browsers without WebAuthn (Chrome iOS), unlock directly — real security is at login
  const handleUnlockEmailKeyBook = async () => {
    if (emailKeyAccounts.length === 0) return;

    // If WebAuthn isn't available on this browser, skip privacy gate and unlock directly
    // The actual security check happens when they tap an email to login
    if (!passkeyAvailable) {
      setEmailKeyBookUnlocked(true);
      return;
    }

    try {
      setPasskeyLoading(true);
      // Use first saved email to trigger Face ID (privacy gate only — no server verify)
      const { data: optData } = await passkeyLoginOptionsMutation({
        variables: { email: emailKeyAccounts[0] },
      });
      if (!optData?.passkeyLoginOptions?.hasEmailKey) {
        // Credentials removed server-side — unlock anyway so user can try individual emails
        setEmailKeyBookUnlocked(true);
        return;
      }
      const { options } = optData.passkeyLoginOptions;
      const parsedOptions = JSON.parse(options);
      const { startAuthentication } = await import('@simplewebauthn/browser');
      await startAuthentication({ optionsJSON: parsedOptions });
      // Face ID succeeded — reveal the email list
      setEmailKeyBookUnlocked(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message?.includes('cancelled')) {
        // User cancelled Face ID — stay locked
        return;
      }
      // Any other error (credential not on device, etc.) — unlock anyway
      setEmailKeyBookUnlocked(true);
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Handle EmailKey registration (called after successful login via other method)
  const handleEmailKeyRegister = async () => {
    try {
      setPasskeyLoading(true);
      setError(null);

      const { startRegistration } = await import('@simplewebauthn/browser');

      // Step 1: Get registration options
      const { data: optData } = await passkeyRegisterOptionsMutation();
      if (!optData?.passkeyRegisterOptions) {
        throw new Error('Failed to get registration options');
      }

      const { sessionId, options } = optData.passkeyRegisterOptions;
      const parsedOptions = JSON.parse(options);

      // Step 2: Trigger Face ID / Touch ID prompt for registration
      const credential = await startRegistration({ optionsJSON: parsedOptions });

      // Step 3: Verify and store credential
      const { data: verifyData } = await passkeyRegisterVerifyMutation({
        variables: {
          input: {
            sessionId,
            credential: JSON.stringify(credential),
            friendlyName: navigator.platform || 'My Device',
          },
        },
      });

      if (verifyData?.passkeyRegisterVerify?.success) {
        localStorage.setItem('emailkey_registered', 'true');

        // Save email to EmailKey Book for instant login next time
        const emailToSave = pendingEmailKeyEmail || me?.email;
        if (emailToSave) {
          try {
            const saved = localStorage.getItem('emailkey_accounts');
            const accounts: string[] = saved ? JSON.parse(saved) : [];
            if (!accounts.includes(emailToSave)) {
              accounts.push(emailToSave);
              localStorage.setItem('emailkey_accounts', JSON.stringify(accounts));
            }
          } catch (_) {}
        }

        setShowPasskeyPrompt(false);
        const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
        router.push(redirectUrl);
      }
    } catch (err: any) {
      console.error('[EmailKey] Registration error:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('cancelled')) {
        // User cancelled Face ID — keep the prompt up, they must complete it
        setError(null);
      } else {
        setError('Face ID setup failed. Please try again — your account needs this to stay secure.');
      }
      // Do NOT redirect — user must complete EmailKey setup
    } finally {
      setPasskeyLoading(false);
    }
  };

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
        setCreatedWalletAddress(hdWalletAddress || null);
        await setJwt(jwt);

        // Auto-trigger EmailKey setup — their email goes straight into the book
        if (passkeyAvailable) {
          setPendingEmailKeyEmail(createEmail.trim().toLowerCase());
          setCreateLoading(false);
          setLoginMode('login');
          setShowPasskeyPrompt(true);
        } else {
          setAccountCreated(true);
          setTimeout(() => {
            const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
            router.push(redirectUrl);
          }, 1500);
        }
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

        // Try getRedirectResult with retry — MetaMask/Coinbase extensions can interfere
        // with localStorage on initial page load (PKCE verifier lost). A short delay
        // before retry lets extensions finish their injection.
        const attemptGetRedirectResult = async (): Promise<any> => {
          const oauthPromise = (magic as any).oauth.getRedirectResult();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`OAuth timeout after ${timeoutMs/1000}s`)), timeoutMs)
          );
          return Promise.race([oauthPromise, timeoutPromise]);
        };

        let oauthResult = null;
        let lastError: any = null;

        // Attempt 1: immediate
        try {
          oauthResult = await attemptGetRedirectResult();
        } catch (err: any) {
          lastError = err;
          console.log('[Auth] getRedirectResult attempt 1 failed:', err.message);
        }

        // Attempt 2: after 1s delay (lets MetaMask/Coinbase finish injecting)
        if (!oauthResult?.magic?.idToken && lastError) {
          try {
            await new Promise(r => setTimeout(r, 1000));
            oauthResult = await attemptGetRedirectResult();
            lastError = null;
          } catch (err: any) {
            lastError = err;
            console.log('[Auth] getRedirectResult attempt 2 failed:', err.message);
          }
        }

        if (oauthResult?.magic?.idToken) {
          const loginResult = await login({ variables: { input: { token: oauthResult.magic.idToken } } });
          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt);
            localStorage.setItem('didToken', oauthResult.magic.idToken);
            await handlePostLoginRedirect(undefined, true); // isOAuth = true — skip Face ID gate
            return;
          } else {
            throw new Error('OAuth login failed: No JWT returned from server');
          }
        }

        // Both getRedirectResult attempts failed — try credential flow as fallback
        if (lastError) {
          console.log('[Auth] getRedirectResult failed, trying credential flow...', lastError.message);
        }

        try {
          await magic.auth.loginWithCredential();
          const didToken = await magic.user.getIdToken();
          localStorage.setItem('didToken', didToken);
          const loginResult = await login({ variables: { input: { token: didToken } } });
          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt);
            await handlePostLoginRedirect(undefined, true);
            return;
          }
        } catch (credErr: any) {
          console.log('[Auth] loginWithCredential failed:', credErr?.message);
        }

        // Last resort: try getIdToken in case Magic session is valid despite errors
        try {
          const fallbackToken = await magic.user.getIdToken();
          if (fallbackToken) {
            localStorage.setItem('didToken', fallbackToken);
            const loginResult = await login({ variables: { input: { token: fallbackToken } } });
            if (loginResult.data?.login.jwt) {
              await setJwt(loginResult.data.login.jwt);
              await handlePostLoginRedirect(undefined, true);
              return;
            }
          }
        } catch (_) {}

        // All methods exhausted
        if (isMobile) {
          throw new Error('Google login is not supported on mobile browsers. Please enter your email address below to log in.');
        }
        throw new Error(lastError?.message || 'Google login failed. Please try again, or use Email login.');
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
      // EmailKey check — try Face ID first (fastest path, no network round-trip)
      // Don't gate on passkeyAvailable — handleEmailKeyLogin checks server-side and handles errors
      if (values.email) {
        const emailKeySuccess = await handleEmailKeyLogin(values.email.toLowerCase().trim());
        if (emailKeySuccess) return; // EmailKey login worked — done
      }

      // L1 Email Bypass — direct email-to-JWT, no Magic SDK involved.
      // Enter email → recognized user → instant JWT → in.
      setError(null);
      setLoggingIn(true);

      const email = values.email?.toLowerCase().trim();
      if (!email) {
        setError('Please enter your email address.');
        setLoggingIn(false);
        return;
      }

      console.log('[Auth] L1 Email Bypass — direct login for:', email);

      const result = await loginByEmailMutation({
        variables: { email },
      });

      const jwt = result.data?.loginByEmail?.jwt;
      if (jwt) {
        await setJwt(jwt);
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[Auth] L1 Email Bypass — success, checking Face ID gate...');
        await handlePostLoginRedirect(email);
      } else {
        throw new Error('Login failed: No JWT returned');
      }
    } catch (error: any) {
      console.error('[Auth] L1 Email Bypass error:', error);
      const msg = error?.message || '';
      if (msg.includes('EMAILKEY_REQUIRED')) {
        // Account is secured with Face ID — auto-add to local EmailKey Book
        // (localStorage is per-browser, so this syncs the list when switching browsers)
        const emailLower = values.email?.toLowerCase().trim();
        if (emailLower) {
          setEmailKeyAccounts(prev => {
            const updated = prev.includes(emailLower) ? prev : [...prev, emailLower];
            localStorage.setItem('emailkey_accounts', JSON.stringify(updated));
            return updated;
          });
          setPendingForceEmail(emailLower);
        }
        setError('This account is secured with Face ID. No Face ID on this device? Use the button below to login with email.');
      } else if (msg.includes('No account found')) {
        setError('No account found with this email. Create an account below, or try Google login.');
      } else if (msg.includes('cancelled') || msg.includes('denied')) {
        setError(null);
      } else {
        setError('Login failed. Please check your email and try again.');
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
          {loginMode === 'create' && !accountCreated && (
            <div className="w-full rounded-xl bg-black/40 border border-cyan-500/30 p-4 backdrop-blur-sm">
              <div className="text-center mb-3">
                <p className="text-sm font-semibold text-white">Create Your Account</p>
                <p className="text-[10px] text-cyan-300 mt-0.5">Stream. Earn. Own. LFG.</p>
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

          {/* Account Created Success */}
          {accountCreated && (
            <div className="w-full rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-center backdrop-blur-sm">
              <p className="text-green-400 font-semibold text-sm">Account Created!</p>
              {createdWalletAddress ? (
                <>
                  <p className="text-[10px] text-gray-400 mt-1">Your HD Wallet</p>
                  <p className="text-[10px] text-cyan-300 font-mono mt-0.5 break-all">{createdWalletAddress}</p>
                </>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1">Welcome to SoundChain</p>
              )}
              <div className="mt-3">
                <div className="animate-spin w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[10px] text-gray-400 mt-1">Redirecting to feed...</p>
              </div>
            </div>
          )}

          {/* ========== EMAILKEY REGISTRATION PROMPT (MANDATORY) ========== */}
          {/* Shows after ANY login if this email isn't in the EmailKey Book yet */}
          {/* No "Not Now" — user MUST complete Face ID setup to secure their account */}
          {showPasskeyPrompt && (
            <div className="w-full rounded-xl bg-black/60 border border-cyan-500/40 p-5 backdrop-blur-sm text-center">
              {/* Shield icon */}
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <p className="text-base font-bold text-white mb-1">Secure Your Profile</p>
              {(pendingEmailKeyEmail || me?.email) && (
                <p className="text-[11px] text-cyan-300/80 font-mono mb-2">{pendingEmailKeyEmail || me?.email}</p>
              )}
              <p className="text-[11px] text-gray-300 mb-1">
                Face ID locks your account to YOUR device.
              </p>
              <p className="text-[10px] text-gray-500 mb-1">
                No one can access your profile — even if they know your email.
              </p>
              <p className="text-[10px] text-cyan-400/70 mb-4">
                One tap. Apple-grade security. Required to continue.
              </p>
              {error && (
                <div className="mb-3 py-1.5 px-2 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-400">
                  {error}
                </div>
              )}
              <button
                onClick={handleEmailKeyRegister}
                disabled={passkeyLoading}
                className="w-full py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
              >
                {passkeyLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Securing account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
                      <path d="M12 8c-2.2 0-4 1.8-4 4" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
                    </svg>
                    {emailKeyAccounts.length > 0 ? 'Add to EmailKey Book' : 'Activate Face ID'}
                  </span>
                )}
              </button>
              <p className="text-[9px] text-gray-600 mt-3">
                Your Face ID key is stored in your device&apos;s Secure Enclave — it never leaves your hardware.
              </p>
            </div>
          )}

          {/* ========== LOGIN (Face ID + Google + Email OTP) ========== */}
          {loginMode === 'login' && !showPasskeyPrompt && (
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

              {/* Force email login — shown when Face ID is required but device doesn't support it */}
              {pendingForceEmail && (
                <button
                  onClick={async () => {
                    try {
                      setError(null);
                      setLoggingIn(true);
                      const result = await loginByEmailMutation({
                        variables: { email: pendingForceEmail, force: true },
                      });
                      const jwt = result.data?.loginByEmail?.jwt;
                      if (jwt) {
                        await setJwt(jwt);
                        setPendingForceEmail(null);
                        await new Promise(resolve => setTimeout(resolve, 200));
                        await handlePostLoginRedirect(pendingForceEmail);
                      }
                    } catch (err: any) {
                      console.error('[Auth] Force email login error:', err);
                      setError('Force login failed. Try Google login instead.');
                      setLoggingIn(false);
                    }
                  }}
                  className="mb-2 w-full py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white transition-all"
                >
                  Login with email anyway (skip Face ID)
                </button>
              )}

              {/* In-app warning */}
              {inAppBrowserWarning && (
                <div className="mb-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-2 text-center w-full">
                  <p className="text-[10px] text-yellow-400">In-app browser detected. Open in Safari/Chrome for Google.</p>
                </div>
              )}

              {/* OTP / Magic Link waiting indicator */}
              {waitingForOtp && (
                <div className="mb-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 p-2 text-center animate-pulse w-full">
                  <p className="text-xs text-cyan-400">
                    Check email for code
                  </p>
                </div>
              )}

              <div className="w-full">
                {/* EmailKey Book — LOCKED: Face ID to reveal emails */}
                {/* Show if accounts exist — don't gate on passkeyAvailable since localStorage is per-browser */}
                {emailKeyAccounts.length > 0 && !emailKeyBookUnlocked && (
                  <>
                    <button
                      onClick={handleUnlockEmailKeyBook}
                      disabled={passkeyLoading}
                      className="mb-2 w-full rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 flex items-center gap-2 hover:bg-cyan-500/10 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="text-[11px] text-cyan-400 font-medium flex-1 text-left">EmailKey Book</span>
                      <span className="text-[10px] text-cyan-400/40">{emailKeyAccounts.length} key{emailKeyAccounts.length !== 1 ? 's' : ''}</span>
                      {passkeyLoading ? (
                        <span className="animate-spin w-3 h-3 border border-cyan-400 border-t-transparent rounded-full flex-shrink-0"></span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
                          <path d="M12 8c-2.2 0-4 1.8-4 4" />
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
                        </svg>
                      )}
                    </button>
                    <p className="text-[9px] text-cyan-400/30 text-center mb-2 -mt-1">Tap to unlock with Face ID</p>

                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-700"></div>
                      <span className="text-gray-600 text-[10px]">OR</span>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>
                  </>
                )}

                {/* EmailKey Book — UNLOCKED: tap email to login with Face ID */}
                {emailKeyAccounts.length > 0 && emailKeyBookUnlocked && (
                  <>
                    <div className="mb-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-cyan-500/10 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                        </svg>
                        <span className="text-[10px] text-cyan-400 font-medium">EmailKeys</span>
                        <span className="text-[9px] text-green-400/70 ml-auto">unlocked</span>
                      </div>
                      {emailKeyAccounts.map((email) => (
                        <button
                          key={email}
                          onClick={() => handleEmailKeyLogin(email)}
                          disabled={passkeyLoading}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-cyan-500/10 transition-colors border-b border-cyan-500/5 last:border-b-0"
                        >
                          <span className="text-[11px] text-white/80 truncate flex-1">{email}</span>
                          {passkeyLoading ? (
                            <span className="animate-spin w-3 h-3 border border-cyan-400 border-t-transparent rounded-full flex-shrink-0"></span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
                              <path d="M12 8c-2.2 0-4 1.8-4 4" />
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-700"></div>
                      <span className="text-gray-600 text-[10px]">OR</span>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>
                  </>
                )}

                {/* Google OAuth */}
                <div className="mb-2">
                  <GoogleButton />
                </div>

                {/* Email login — always available as fallback */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-gray-600 text-[10px]">OR</span>
                  <div className="flex-1 h-px bg-gray-700"></div>
                </div>

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
