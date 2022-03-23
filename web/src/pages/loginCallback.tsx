import type { NextPage } from 'next';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';
import { useState, useEffect } from 'react';
import { setJwt } from 'lib/apollo';
import Cookies from 'js-cookie';
import { useLoginMutation } from 'lib/graphql';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/dist/client/router';
import { config } from 'config';

const renderProfile = profile => {
  const user = profile?.oauth?.userInfo ?? null;
  return (
    <div>
      <p>Name: {user?.name}</p>
      <p>Email: {user?.email}</p>
    </div>
  );
};

interface iCallback {
  apiKey: string;
}

const LoginCallbackPage: NextPage<iCallback> = ({ apiKey }) => {
  const magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null = null;
  const [profile, setProfile] = useState(null);
  const [login] = useLoginMutation();
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    async function doLogin() {
      let result;
      try {
        result = await magic?.oauth.getRedirectResult();
        console.log('result :>> ', result);
        setProfile(result);
      } catch (error) {
        console.log('Error in getRedirectResult: ', error);
      }

      if (result && result.magic?.idToken) {
        const token = result.magic.idToken;
        console.log('token :>> ', token);

        // try {
        const loginRes = await login({ variables: { input: { token } } });
        const jwt = loginRes.data?.login?.jwt;
        console.log('jwt :>> ', jwt);
        setJwt(jwt);
        // } catch (error) {
        //   console.log('Login error: ', error);
        //   const tokenCookie = Cookies.get('token');
        //   console.log('tokenCookie :>> ', tokenCookie);
        // }
      }
    }
    if (!magic) {
      magic = new Magic(apiKey, {
        extensions: [new OAuthExtension()],
      });
    }

    if (!profile) {
      console.log('logging in');
      doLogin();
    }
  }, [magic, profile]);

  useEffect(() => {
    if (me) {
      console.log('Is me, redirecting');
      router.push(router.query.callbackUrl?.toString() ?? `${config.redirectUrlPostLogin}`);
    }
  }, [me, router]);

  return (
    <div>
      <main style={{ color: 'white' }}>
        <h3>Magic Oauth Prototype</h3>
        <br />
        {profile ? renderProfile(profile) : 'Loading profile...'}
      </main>
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
