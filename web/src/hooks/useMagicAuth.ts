import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { Magic } from 'magic-sdk';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { testNetwork } from '../lib/blockchainNetworks';

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || '';

const useMagicAuth = () => {
  const [magic, setMagic] = useState<InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>>>();
  const [web3, setWeb3] = useState<Web3>();


  useEffect(() => {
    const magic = new Magic(magicPublicKey, {
      network: {
        rpcUrl: testNetwork.rpc,
        chainId: testNetwork.id,
      },
    });
    magic.preload();
    setMagic(magic);
    setWeb3(new Web3(magic.rpcProvider));
  }, []);

  const connect = async (email?: string) => {
    if (magic && email) {
      return await magic.auth.loginWithMagicLink({
        email: email
      });
    }
  };

  const logout = async () => {
    if(magic) {
      return await magic.user.logout()
    }
  }

  return { connect, logout };
};

export default useMagicAuth;
