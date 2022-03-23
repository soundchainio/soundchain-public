import type { NextPage } from 'next';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';
import { useState, useEffect, useCallback } from 'react';
import { setJwt } from 'lib/apollo';
import Cookies from 'js-cookie';
import { useLoginMutation } from 'lib/graphql';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/dist/client/router';
import { config } from 'config';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { isApolloError } from '@apollo/client';
interface iCallback {
  apiKey: string;
}

const LoginCallbackPage: NextPage<iCallback> = ({ apiKey }) => {
  const magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null = null;
  const [profile, setProfile] = useState(null);
  const [login] = useLoginMutation();
  const me = useMe();
  const router = useRouter();

  const handleError = useCallback(
    (error: Error) => {
      router.push('/create-account');
    },
    [router],
  );

  useEffect(() => {
    async function doLogin() {
      let result;
      try {
        result = await magic?.oauth.getRedirectResult();
        setProfile(result);
      } catch (error) {}

      if (result && result.magic?.idToken) {
        const token = result.magic.idToken;

        try {
          const loginRes = await login({ variables: { input: { token } } });
          const jwt = loginRes.data?.login?.jwt;
          setJwt(jwt);
        } catch (error) {
          handleError(error);
        }
      }
    }
    if (!magic) {
      magic = new Magic(apiKey, {
        extensions: [new OAuthExtension()],
      });
    }

    if (!profile) {
      doLogin();
    }
  }, [magic, profile]);

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
