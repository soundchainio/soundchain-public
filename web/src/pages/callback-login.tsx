import { AuthLayout } from 'components/AuthLayout';
import { BackButton } from 'components/Buttons/BackButton';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { LogoAndText } from 'icons/LogoAndText';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { useEffect } from 'react';

export default function MagicLoginPage() {
  const [login] = useLoginMutation();
  const me = useMe();
  const { magic } = useMagicContext();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  useEffect(() => {
    const magicLogin = async () => {
      let token;
      try {
        token = await magic.auth.loginWithCredential();
        if (!token) {
          throw new Error();
        }
      } catch (error) {
        console.error(error);
        router.push('/login');
      }

      try {
        if (token) {
          const result = await login({ variables: { input: { token } } });
          setJwt(result.data?.login.jwt);
        }
      } catch (error) {
        router.push('/create-account');
      }
    };
    magicLogin();
  }, []);

  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    showLoginSignUpButton: false,
  };

  return (
    <AuthLayout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Login</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col gap-8">
        <div className="h-36 mb-2 flex items-center justify-center">
          <LogoAndText />
        </div>
        <div className=" flex justify-center items-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2"></div>
        </div>
      </div>
    </AuthLayout>
  );
}
