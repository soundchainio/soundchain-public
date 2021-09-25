/* eslint-disable @typescript-eslint/no-explicit-any */
import MetaMaskOnboarding from '@metamask/onboarding';
import { useEffect, useRef, useState } from 'react';
import Web3 from 'web3';

export const useMetaMask = () => {
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [web3, setWeb3] = useState<Web3>();
  const onboarding = useRef<MetaMaskOnboarding>();

  const handleNewAccount = ([newAccount]: string[]) => {
    web3?.eth.getBalance(newAccount).then(balance => {
      setBalance(web3.utils.fromWei(balance, 'ether'));
    });
    setAccount(newAccount);
  };

  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (account) {
        onboarding?.current?.stopOnboarding();
      }
    }
  }, [account]);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      setWeb3(new Web3((window as any).ethereum));
      (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then(handleNewAccount);
      (window as any).ethereum.on('accountsChanged', handleNewAccount);
      (window as any).ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const connect = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then(handleNewAccount);
    } else {
      onboarding?.current?.startOnboarding();
    }
  };

  return { connect, account, balance, web3 };
};

export default useMetaMask;
