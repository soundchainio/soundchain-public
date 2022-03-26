import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { config } from 'config';
import { useMe } from 'hooks/useMe';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { Magic } from 'magic-sdk';
import type { NextPage } from 'next';
import { useRouter } from 'next/dist/client/router';
import { useCallback, useEffect, useState } from 'react';
interface iCallback {
  apiKey: string;
}

const LoginCallbackPage: NextPage<iCallback> = ({ apiKey }) => {
  let magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null = null;
  const [isLoaded, setIsLoaded] = useState(false);
  const [login] = useLoginMutation();
  const me = useMe();
  const router = useRouter();

  const handleError = useCallback(() => {
    router.push('/create-account');
  }, [router]);

  useEffect(() => {
    async function doLogin() {
      let result;
      try {
        result = await magic?.oauth.getRedirectResult();
        if (result) setIsLoaded(true);
      } catch (error) {
        handleError();
      }

      if (result && result.magic?.idToken) {
        const token = result.magic.idToken;

        try {
          const loginRes = await login({ variables: { input: { token } } });
          const jwt = loginRes.data?.login?.jwt;
          setJwt(jwt);
        } catch (error) {
          handleError();
        }
      }
    }
    if (!magic) {
      magic = new Magic(apiKey, {
        extensions: [new OAuthExtension()],
      });
    }

    if (!isLoaded) {
      doLogin();
    }
  }, [magic, isLoaded]);

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? `${config.redirectUrlPostLogin}`);
    }
  }, [me, router]);

  return (
    <div className="flex items-center justify-center w-full h-full text-center font-bold sm:px-4 py-3">
      <LoaderAnimation ring />
      <span className="text-white">Logging in</span>
    </div>
  );
};

export function getStaticProps() {
  const apiKey = process.env.NEXT_PUBLIC_MAGIC_KEY ?? '';

  return {
    props: {
      apiKey,
    },
  };
}

export default LoginCallbackPage;
