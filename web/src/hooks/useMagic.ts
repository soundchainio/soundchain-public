import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { Magic } from 'magic-sdk';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { testNetwork } from '../lib/blockchainNetworks';
import { useMe } from './useMe';

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY;

const useMagic = () => {
  const [magic, setMagic] = useState<InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>>>();
  const [web3, setWeb3] = useState<Web3>();
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const me = useMe();

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

  useEffect(() => {
    const checkLogin = async () => {
      const userLoggedIn = await magic.user.isLoggedIn();
      if (userLoggedIn) {
        const meta = await magic.user.getMetadata();
        if (meta.email !== me.email) {
          await magic.user.logout();
          setAccount(undefined);
          return;
        }
        setAccount(meta.publicAddress);
      }
    };
    if (me && magic) {
      checkLogin();
    }
  }, [me, magic]);

  useEffect(() => {
    if (account) {
      web3.eth.getBalance(account).then(balance => {
        setBalance(web3.utils.fromWei(balance, 'ether'));
      });
    }
  }, [account, web3]);

  const connect = async () => {
    await magic.auth.loginWithMagicLink({
      email: me.email,
    });
    const meta = await magic.user.getMetadata();
    setAccount(meta.publicAddress);
  };

  return { web3, account, balance, connect };
};

export default useMagic;
