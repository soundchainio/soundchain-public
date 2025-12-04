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

  useEffect(() => {
    setIsClient(true);
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
        const authMethodFromError = error.graphQLErrors?.find((err) => err.extensions?.with)?.extensions?.with;
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
      const storedToken = localStorage.getItem('didToken');
      if (storedToken && magic) {
        try {
          const isLoggedIn = await magic.user.isLoggedIn();
          if (isLoggedIn) {
            console.log('Validated stored didToken:', storedToken);
            const loginResult = await login({ variables: { input: { token: storedToken } } });
            setJwt(loginResult.data?.login.jwt);
            const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
            router.push(redirectUrl);
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
  }, [magic, login, router]);

  const handleGoogleLogin = async () => {
    try {
      if (!magic) throw new Error('Magic SDK not initialized');
      setLoggingIn(true);
      setError(null);
      await magic.oauth.loginWithRedirect({
        provider: 'google',
        redirectURI: 'https://soundchain.io/login',
        scope: ['openid'],
      });
    } catch (error) {
      handleError(error as Error);
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
          setJwt(loginResult.data?.login.jwt);
          const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
          router.push(redirectUrl);
        } catch (error) {
          handleError(error as Error);
        } finally {
          setLoggingIn(false);
        }
      }
    }
    handleMagicLink();
  }, [magic, magicParam, login, handleError]);

  async function handleSubmit(values: FormValues) {
    try {
      if (!magic) throw new Error('Magic SDK not initialized');
      console.log('Starting login process for email:', values.email);
      setLoggingIn(true);
      setError(null);
      console.log("About to call magic.preload()...");
      // await magic.preload(); // SKIPPED - was causing hang
      console.log('Magic preload completed');

      console.log("About to call loginWithEmailOTP...");
      const didToken = await magic.auth.loginWithEmailOTP({ email: values.email });
      console.log('Received didToken (email OTP):', didToken); // Added logging
      localStorage.setItem('didToken', didToken); // Persist token

      if (!didToken) {
        throw new Error('Error connecting Magic: No token returned');
      }

      const result = await login({ variables: { input: { token: didToken } } });
      console.log('GraphQL login mutation result:', result);
      setJwt(result.data?.login.jwt);
      const redirectUrl = router.query.callbackUrl?.toString() ?? config.redirectUrlPostLogin;
      console.log('Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    } catch (error) {
      console.error('Login error:', error);
      handleError(error as Error);
      setLoggingIn(false);
    }
  }

  const GoogleButton = () => (
    <HoverableButton
      variant="default"
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
