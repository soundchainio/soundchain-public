import MetaMaskOnboarding from '@metamask/onboarding';
import { network } from 'lib/blockchainNetworks';
import { useUpdateMetaMaskAddressesMutation } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import Web3 from 'web3';

export const useMetaMask = () => {
  const [updateWallet] = useUpdateMetaMaskAddressesMutation();
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
    const onSetAccount = async (newAccount: string) => {
      if (newAccount) {
        await updateWallet({ variables: { input: { wallet: newAccount } } });
      }
      setAccount(newAccount);
    };

    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (window.ethereum.selectedAddress) {
        window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(([newAccount]: string[]) => onSetAccount(newAccount));
      }
      window.ethereum.on('accountsChanged', ([newAccount]: string[]) => onSetAccount(newAccount));
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, [updateWallet]);

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

  const refetchBalance = () => {
    if (web3 && account) {
      web3.eth.getBalance(account).then(balance => {
        setBalance(web3.utils.fromWei(balance, 'ether'));
      });
    }
  };

  const addMumbaiTestnet = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: network.idHex, // A 0x-prefixed hexadecimal string
            chainName: network.name,
            nativeCurrency: {
              name: network.name,
              symbol: network.symbol, // 2-6 characters long
              decimals: 18,
            },
            rpcUrls: [network.rpc],
            blockExplorerUrls: [network.blockExplorer],
          },
        ],
      });
    } else {
      onboarding?.current?.startOnboarding();
    }
  };

  const onSetAccount = async (newAccount: string) => {
    await updateWallet({ variables: { input: { wallet: newAccount } } });
    setAccount(newAccount);
  };

  const connect = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(([newAccount]: string[]) => onSetAccount(newAccount));
    } else {
      onboarding?.current?.startOnboarding();
    }
  };

  return { connect, addMumbaiTestnet, account, balance, chainId, web3, refetchBalance };
};

export default useMetaMask;
