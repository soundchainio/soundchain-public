import type { NextPage } from 'next';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    async function doLogin() {
      const result = await magic?.oauth.getRedirectResult();
      console.log('result :>> ', result);
      setProfile(result);
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
  const apiKey = process.env.NEXT_IANS_GOOGLE_API_KEY ?? '';

  return {
    props: {
      apiKey,
    },
  };
}

export default LoginCallbackPage;
