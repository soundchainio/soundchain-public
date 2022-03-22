import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider';
import { useState, useEffect } from 'react';

interface iCallback {
  apiKey: string;
}

const BlankPage: NextPage<iCallback> = ({ apiKey }) => {
  let magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null = null;
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

export default BlankPage;
