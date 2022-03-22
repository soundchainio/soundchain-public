import type { NextPage } from 'next';
import { useState } from 'react';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
// Local
import { useEffect } from 'react';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';

interface iHome {
  apiKey: string;
}

const NewLoginPage: NextPage<iHome> = ({ apiKey }) => {
  let magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null = null;

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!magic) {
      magic = new Magic(apiKey, {
        extensions: [new OAuthExtension()],
      });
    }
  }, [magic]);

  const handleLogin = async () => {
    setIsLoading(true);
    await magic?.oauth.loginWithRedirect({
      provider: 'google',
      redirectURI: `${window.location.origin}/loginCallback`,
    });
  };

  return (
    <div>
      <main style={{ color: 'white' }}>
        <h3>Magic Oauth Prototype</h3>
        <br />
        {isLoading ? 'Loading...' : <button onClick={() => handleLogin()}>Sign in with Google</button>}
      </main>
    </div>
  );
};

export function getStaticProps() {
  const apiKey = process.env.NEXT_IANS_GOOGLE_API_KEY ?? '';
  console.log('apiKey :>> ', apiKey);

  return {
    props: {
      apiKey,
    },
  };
}

export default NewLoginPage;
