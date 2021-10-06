import MetaMaskOnboarding from '@metamask/onboarding';
import { testNetwork } from 'lib/blockchainNetworks';
import { useEffect, useRef, useState } from 'react';
import Web3 from 'web3';

export const useMetaMask = () => {
  const [web3, setWeb3] = useState<Web3>();
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const onboarding = useRef<MetaMaskOnboarding>();

  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }

    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      setWeb3(new Web3(window.ethereum));
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (window.ethereum.selectedAddress) {
        window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(([newAccount]: string[]) => setAccount(newAccount));
      }
      window.ethereum.on('accountsChanged', ([newAccount]: string[]) => setAccount(newAccount));
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (account && web3) {
        onboarding?.current?.stopOnboarding();
        web3.eth.getBalance(account).then(balance => {
          setBalance(web3.utils.fromWei(balance, 'ether'));
        });
        window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
          setChainId(parseInt(chainId, 16));
        });
      } else {
        setAccount(undefined);
        setBalance(undefined);
      }
    }
  }, [account, web3]);

  const addMumbaiTestnet = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: testNetwork.idHex, // A 0x-prefixed hexadecimal string
            chainName: testNetwork.name,
            nativeCurrency: {
              name: testNetwork.name,
              symbol: testNetwork.symbol, // 2-6 characters long
              decimals: 18,
            },
            rpcUrls: [testNetwork.rpc],
            blockExplorerUrls: [testNetwork.blockExplorer],
          },
        ],
      });
    } else {
      onboarding?.current?.startOnboarding();
    }
  };

  const connect = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(([newAccount]: string[]) => setAccount(newAccount));
    } else {
      onboarding?.current?.startOnboarding();
    }
  };

  return { connect, addMumbaiTestnet, account, balance, chainId, web3 };
};

export default useMetaMask;
