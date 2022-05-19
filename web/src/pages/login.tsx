import { isApolloError } from '@apollo/client';
import { Button } from 'components/Button';
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
import { useRouter } from 'next/dist/client/router';
import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function LoginPage() {
  const [login] = useLoginMutation();
  const [loggingIn, setLoggingIn] = useState(false);
  const { data, loading: loadingMe } = useMeQuery();
  const me = data?.me;
  const { magic } = useMagicContext();
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>();
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext();

  const topNavBarProps = useMemo(
    () => ({
      isLogin: false,
      leftButton: <TopNavBarButton onClick={() => setAuthMethod(undefined)} label="Back" icon={LeftArrow} />,
    }),
    [],
  );

  const handleError = useCallback(
    (error: Error) => {
      if (isApolloError(error) && error.message === 'already exists') {
        setLoggingIn(false);
        setAuthMethod(error.graphQLErrors.find(err => err.extensions.with)?.extensions.with);
      } else if (error.message.toLowerCase().includes('invalid credentials')) {
        router.push('/create-account');
      } else {
        setLoggingIn(false);
        console.warn('warn: ', error);
      }
    },
    [router],
  );

  useEffect(() => {
    setTopNavBarProps(authMethod ? topNavBarProps : { isLogin: true });
    setIsAuthLayout(true);
  }, [setTopNavBarProps, setIsAuthLayout, authMethod, topNavBarProps]);

  useEffect(() => {
    if (me) {
      setIsAuthLayout(false);
      router.push(router.query.callbackUrl?.toString() ?? `${config.redirectUrlPostLogin}`);
    }
  }, [me, router, setIsAuthLayout]);

  const handleGoogleLogin = async () => {
    await magic.oauth.loginWithRedirect({
      provider: 'google',
      redirectURI: `${config.domainUrl}/login`,
      scope: ['openid', 'https://www.googleapis.com/auth/userinfo.email'],
    });
  };

  useEffect(() => {
    function magicGoogle() {
      if (magic && magicParam && magic.oauth) {
        setLoggingIn(true);
        magic.oauth
          .getRedirectResult()
          .then(result => login({ variables: { input: { token: result.magic.idToken } } }))
          .then(result => setJwt(result.data?.login.jwt))
          .catch(handleError);
      }
    }
    magicGoogle();
  }, [magic, magicParam, login, handleError]);

  async function handleSubmit(values: FormValues) {
    try {
      setLoggingIn(true);
      magic.preload();
      const token = await magic.auth.loginWithMagicLink({
        email: values.email,
      });

      if (!token) {
        throw new Error('Error connecting Magic');
      }

      const result = await login({ variables: { input: { token } } });
      setJwt(result.data?.login.jwt);
    } catch (error) {
      handleError(error as Error);
    }
  }

  const GoogleButton = () => (
    <button
      className="flex gap-2 rounded border bg-gray-1A border-gray-30 font-semibold text-sm text-white px-3 py-4"
      onClick={handleGoogleLogin}
    >
      <Google className="mr-1 h-5 w-5" />
      <span>Login with Google</span>
    </button>
  );

  if (loadingMe || me) {
    return (
      <div className="flex items-center justify-center w-full h-full text-center font-bold sm:px-4 py-3">
        <LoaderAnimation ring />
      </div>
    );
  }

  if (loggingIn) {
    return (
      <div className="flex items-center justify-center w-full h-full text-center font-bold sm:px-4 py-3">
        <LoaderAnimation ring />
        <span className="text-white">Logging in</span>
      </div>
    );
  }

  if (authMethod) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex justify-center pt-32 pb-6">
          <UserWarning />
        </div>
        <div className="text-white text-center text-sm py-4">
          An account already exists with that email.
          <br />
          <br />
          If you wish to login to an existing account, you must login using the same login method you used previously:
        </div>
        {authMethod.includes(AuthMethod.Google) && <GoogleButton />}
        {authMethod.includes(AuthMethod.MagicLink) && <LoginForm handleMagicLogin={handleSubmit} />}
        <div className="h-full flex flex-col justify-between">
          <div className="text-white text-center text-sm py-4">
            Alternatively, you may continue by creating a new account with the same email.
          </div>
          <NextLink href="/create-account">
            <Button variant="rainbow" borderColor="bg-purple-gradient">
              CREATE NEW ACCOUNT
            </Button>
          </NextLink>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Login | SoundChain" description="Log in to SoundChain" canonicalUrl="/login/" />
      <div className="h-36 mb-2 flex items-center justify-center">
        <LogoAndText />
      </div>
      <GoogleButton />
      <div className="text-gray-50 text-sm font-bold text-center py-7">OR</div>
      <LoginForm handleMagicLogin={handleSubmit} />
    </>
  );
}