import { useEffect, useState } from 'react';
import { SDKBase, InstanceWithExtensions } from '@magic-sdk/provider';
import { OAuthExtension } from '@magic-ext/oauth';
import { config } from 'config';

export const useMagicContext = () => {
  const [magic, setMagic] = useState<InstanceWithExtensions<SDKBase, OAuthExtension[]> | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const initializeMagic = async () => {
      const { Magic } = await import('magic-sdk');
      const { OAuthExtension } = await import('@magic-ext/oauth');
      const magicInstance = new Magic(config.magicApiKey, {
        extensions: [new OAuthExtension()],
        network: {
          rpcUrl: 'https://polygon-rpc.com',
          chainId: 137,
        },
      });
      setMagic(magicInstance);

      const checkSession = async () => {
        try {
          const loggedIn = await magicInstance.user.isLoggedIn();
          setIsLoggedIn(loggedIn);
          if (!loggedIn && config.magicApiKey) {
            const email = localStorage.getItem('userEmail');
            if (email) {
              await magicInstance.auth.loginWithMagicLink({ email });
              setIsLoggedIn(true);
              localStorage.setItem('lastLoginCheck', Date.now().toString());
            }
          }
        } catch (e) {
          console.error('Session check failed:', e);
          setIsLoggedIn(false);
        }
      };

      checkSession();
      const interval = setInterval(checkSession, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    };

    initializeMagic();
  }, []);

  return { magic, isLoggedIn };
};
