import WalletConnectProvider from "@walletconnect/web3-provider";
import { useEffect, useState } from 'react';
import Web3 from 'web3';
// type IWeb3Provider = typeof IWeb3Provider;

export const useWalletConnect = () => {
  const [provider, setProvider] = useState<WalletConnectProvider>();
  const [web3, setWeb3] = useState<Web3>();
  const [account, setAccount] = useState<string>();

  useEffect(()=> {
    if (!provider) {
      //  Create WalletConnect Provider
      const walletProvider = new WalletConnectProvider({
        rpc: {
          1: 'https://mainnet.infura.io/v3/',//TODO: moved to config & check for rpcs in project
          80001: 'https://rpc-mumbai.matic.today',
        },
      });
      setProvider(walletProvider);
    }
    if (provider) {
      provider.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
      });
      provider.on('disconnect', (code: number, reason: string) => {
        console.log('disconnect: ',code, reason);
      });
    }
  },[provider]);


  const connect = async () => {
    if (provider){
      //  Enable session (triggers QR Code modal)
      await provider.enable();

      //  eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newWeb3 = new Web3(provider as any);
      setWeb3(newWeb3);

      const accounts = await newWeb3.eth.getAccounts();
      setAccount(accounts[0]);
    }
  }

  const disconnect = async () => {
    if (provider) await provider.disconnect();
  }


  return { web3, connect, disconnect, provider, account};
};


export default useWalletConnect;