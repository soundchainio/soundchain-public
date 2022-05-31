import WalletConnectProvider from '@walletconnect/web3-provider';
import SEO from 'components/SEO';
import { Button } from 'components/Button';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { config } from 'config';
import { WalletButton } from 'components/Buttons/WalletButton';
import { MetaMask } from 'icons/MetaMask';
import useMetaMask from 'hooks/useMetaMask';
import { WalletConnect } from 'icons/WalletConnect';
import { testnetNetwork } from 'lib/blockchainNetworks';
import { toast, ToastContainer } from 'react-toastify';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { CustomModal } from '../components/CustomModal';
import {
  useAudioHolderByWalletLazyQuery,
  useWhitelistEntryByWalletLazyQuery,
  useProofBookByWalletLazyQuery,
} from 'lib/graphql';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import useBlockchainV2 from '../hooks/useBlockchainV2';

export default function AirdropPage() {
  const { setIsLandingLayout } = useLayoutContext();
  const [whitelistEntryByWallet, { data: whitelistEntry }] = useWhitelistEntryByWalletLazyQuery();
  const [proofBookByWallet, { data: proofBook, loading: loadingProof }] = useProofBookByWalletLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const { web3: metamaskWeb3 } = useMetaMask();
  const [audioHolderByWallet, { data: audioHolder }] = useAudioHolderByWalletLazyQuery();
  const [account, setAccount] = useState<string>();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [closeModal, setCloseModal] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [web3, setWeb3] = useState<Web3>();
  // const minimunAudioToken = new Decimal('10');
  const { claimOgun } = useBlockchainV2();

  //correct amount at mobile

  useEffect(() => {
    if (account) {
      whitelistEntryByWallet({ variables: { walletAdress: account } });
      audioHolderByWallet({ variables: { walletAdress: account } });
      proofBookByWallet({ variables: { walletAddress: account } });
    }
  }, [account, audioHolderByWallet, whitelistEntryByWallet, proofBookByWallet]);

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  const isOgunClaimedWhitelist = Boolean(whitelistEntry?.whitelistEntryByWallet.ogunClaimed);
  const isOgunClaimedAudioHolder = Boolean(audioHolder?.audioHolderByWallet?.ogunClaimed);
  // const audioBalance = new Decimal(audioHolder?.audioHolderByWallet?.amount || '0');
  // const audioBalanceSize = audioBalance.toString().length;

  const isClaimed =
    (whitelistEntry && isOgunClaimedWhitelist && !audioHolder) ||
    (audioHolder && isOgunClaimedAudioHolder && !whitelistEntry) ||
    (audioHolder && isOgunClaimedAudioHolder && whitelistEntry && isOgunClaimedWhitelist);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider: any = new WalletConnectProvider({
    rpc: {
      1: 'https://cloudflare-eth.com/', // https://ethereumnodes.com/
      137: 'https://polygon-rpc.com/', // https://docs.polygon.technology/docs/develop/network-details/network/
      // ...
    },
  });

  const connectWC = async () => {
    setLoading(true);
    try {
      await provider.enable();
      const web3 = new Web3(provider);
      setWeb3(web3);
      const accounts = await web3.eth?.getAccounts();
      if (accounts) setAccount(accounts[0]); // get the primary account
    } catch (error) {
      setCloseModal(!closeModal);
      console.warn('warn: ', error);
    }
    setLoading(false);
  };

  const connectMetaMask = () => {
    // Metamask Wallet;
    const loadProvider = async () => {
      let provider = null;

      if (window.ethereum) {
        provider = window.ethereum;
        try {
          await provider.request({ method: 'eth_requestAccounts' });
        } catch (error) {
          console.warn(error);
        }
      } else if (!process.env.production) {
        provider = new Web3.providers.HttpProvider(testnetNetwork.rpc);
      }
      const web3API = new Web3(provider);
      const accounts = await web3API.eth.getAccounts();
      setAccount(accounts[0]);
    };

    const loadMetaMaskProvider = async (web3: Web3) => {
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
    };

    !web3 ? loadProvider() : loadMetaMaskProvider(web3);

    setShowModal(false);
    setWeb3(metamaskWeb3);
  };

  const handleClaimOgun = () => {
    const result = callOgunContract();
    console.log(result);
    result.onReceipt(() => {
      setIsFinished(true);
    }).onError((cause: Error) => {
      console.log(cause);
      toast.error('There was an error while trying to claim. Please, try again later.');
    }).finally(() => {
      setLoading(false);
    }).execute(web3 as Web3);
      //   await updateOgunClaimedWhitelist({
      //     variables: { input: { id: whitelistEntry?.whitelistEntryByWallet.id, ogunClaimed: true } },
      //   });
      // }
    
  };

  const callOgunContract = () => {
    const address = proofBook?.getProofBookByWallet?.address;
    // const root = proofBook?.getProofBookByWallet?.root;
    const value = proofBook?.getProofBookByWallet?.value;
    const proof = proofBook?.getProofBookByWallet?.merkleProof;
    console.log('ADDRESS: ', address);
    console.log('VALUE: ', value);
    console.log('PROOF: ', proof);
    // const contract = claimOgunContract(web3 as Web3);
    // contract.handleRevert = true;
    // try {
    // const claimOgun = await contract.methods.claim(address, value, proof).send();
    // return claimOgun;
    // } catch (error) {
    //   console.log(error);
    //   return undefined;
    // }
    return claimOgun(address as string, address as string, value as string, proof as string[]);
  };

  const ConnectAccountState = () => {
    return (
      <>
        <CustomModal show={showModal} onClose={() => setShowModal(false)}>
          <div className="w-96 rounded bg-white p-6">
            <h1 className="text-2xl font-bold text-blue-500">CONNECT WALLET</h1>
            <p className="py-1 text-gray-500">Connect with one of our available wallet providers</p>
            <div className="my-4 space-y-3">
              <WalletButton caption="Metamask" icon={MetaMask} handleOnClick={connectMetaMask} />
              <WalletButton caption="WalletConnect" icon={WalletConnect} handleOnClick={connectWC} />
            </div>
          </div>
        </CustomModal>
        <div>
          <h1 className="text-center text-2xl font-extrabold md:text-5xl">
            Connect your <span className="green-blue-gradient-text-break">wallet</span>
          </h1>
          <h2 className="pt-6 text-center text-xl font-light md:text-4xl">
            If you are an existing SoundChain user,
            <br />
            joined the whitelist, or had any AUDIO when
            <br />
            we took a snapshop on June 20, connect
            <br />
            your wallet to claim <span className="yellow-gradient-text font-bold">5,000 OGUN</span>
          </h2>
        </div>
        <Button variant="rainbow" className="w-5/6" onClick={() => setShowModal(true)}>
          <span className="font-medium ">CONNECT</span>
        </Button>
      </>
    );
  };

  // const AudioWhitelistState = () => {
  //   return (
  //     <>
  //       <h2 className="text-center text-2xl font-light md:text-4xl">
  //         Based on how much AUDIO you own, you are able to claim this much OGUN
  //       </h2>

  //       <h2 className="flex flex-col items-center whitespace-pre-wrap text-center text-2xl font-medium md:flex-row md:text-4xl">
  //         <span>
  //           {audioBalanceSize < 8 ? audioBalance.toString() : audioBalance.toString().substring(0, 8) + '...'}{' '}
  //           <span className="purple-blue-gradient-text-break">$AUDIO</span>
  //         </span>
  //         <span className="m-1 w-12 grow  border-b border-white" />
  //         <span>
  //           50 <span className="green-blue-gradient-text-break">OGUN</span>
  //         </span>
  //       </h2>
  //       <h2 className="text-center text-xl font-light md:text-4xl">
  //         Also for joining the whitelist:{' '}
  //         <span className="font-medium">
  //           {' '}
  //           50 <span className="green-blue-gradient-text-break">OGUN</span>
  //         </span>
  //       </h2>
  //       <Button variant="rainbow" className="w-5/6" onClick={handleClaimOgun}>
  //         <span className="font-medium ">CLAIM</span>
  //       </Button>
  //     </>
  //   );
  // };

  const WhitelistState = () => {
    return (
      <>
        <div>
          <h1 className="text-center text-2xl font-extrabold md:text-5xl">
            Connect your <span className="green-blue-gradient-text-break">wallet</span>
          </h1>
          <h2 className="pt-6 text-center text-xl font-light md:text-4xl">
            If you are an existing SoundChain user,
            <br />
            joined the whitelist, or had any AUDIO when
            <br />
            we took a snapshop on June 20, connect
            <br />
            your wallet to claim <span className="yellow-gradient-text font-bold">5,000 OGUN</span>
          </h2>
        </div>
        <Button variant="rainbow" className="w-5/6" onClick={handleClaimOgun}>
          <span className="font-medium ">CLAIM</span>
        </Button>
      </>
    );
  };

  // const AudioState = () => {
  //   return (
  //     <>
  //       <h2 className="text-center text-2xl font-light md:text-4xl">
  //         Based on how much AUDIO you own, you are able to claim this much OGUN
  //       </h2>
  //       <h2 className="flex flex-col items-center whitespace-pre-wrap text-center text-2xl font-medium md:flex-row md:text-4xl">
  //         <span>
  //           {audioBalanceSize < 8 ? audioBalance.toString() : audioBalance.toString().substring(0, 8) + '...'}{' '}
  //           <span className="purple-blue-gradient-text-break">$AUDIO</span>
  //         </span>
  //         <span className="m-1 w-12 grow  border-b border-white" />
  //         <span>
  //           50 <span className="green-blue-gradient-text-break">OGUN</span>
  //         </span>
  //       </h2>
  //       <Button variant="rainbow" className="w-5/6">
  //         <span className="font-medium ">CLAIM</span>
  //       </Button>
  //     </>
  //   );
  // };

  const WithoutAudioState = () => {
    return (
      <h2 className="pt-6 text-center text-2xl font-light md:text-4xl">
        Sorry, you didn&#39;t have enough AUDIO at the time of the Airdrop. You can earn some OGUN by trading on the
        platform or through some other methods.{' '}
        <Link href="/">
          <a className="green-blue-gradient-text-break font-medium">Learn more here.</a>
        </Link>
      </h2>
    );
  };

  const ClaimedState = () => {
    return (
      <>
        <h2 className="text-center text-2xl font-light md:text-4xl">
          You already claimed your <span className="green-blue-gradient-text-break">OGUN</span>
        </h2>
        <Button variant="rainbow" className="w-5/6">
          <span className="font-medium ">EXPLORE</span>
        </Button>
      </>
    );
  };

  const FinishedState = () => {
    return (
      <>
        <h2 className="text-center text-2xl font-light md:text-4xl">
          Thanks for claiming your <span className="green-blue-gradient-text-break">OGUN</span>
        </h2>
        <Link href="/marketplace" passHref={true}>
        <Button variant="rainbow" className="w-5/6">
          <span className="font-medium ">SoundChain Community</span>
        </Button>
        </Link>
      </>
    );
  };

  const ClosedState = () => {
    return (
      <>
        <h2 className="pt-6 text-center text-2xl font-light md:text-4xl">
          Sorry, the Airdrop is closed. You can{' '}
          <Link href="/">
            <a className="green-blue-gradient-text-break font-medium">get OGUN here.</a>
          </Link>
        </h2>
      </>
    );
  };

  return (
    <>
    <ToastContainer
          position="top-center"
          autoClose={6 * 1000}
          toastStyle={{
            backgroundColor: '#202020',
            color: 'white',
            fontSize: '12x',
            textAlign: 'center',
          }}
        />
      <SEO title="Airdrop" canonicalUrl="/airdrop" description="Collect your Ogun tokens" />
      <main className="flex h-full w-full items-center justify-center py-32 font-rubik text-white">
        <div className="flex max-w-3xl flex-col items-center justify-center gap-y-12 pb-0 md:pb-40">
          {!config.airdropStatus ? (
            <ClosedState />
          ) : !account ? (
            <ConnectAccountState />
          ) : loading || loadingProof ? (
            <LoaderAnimation loadingMessage="Loading" />
          ) : isFinished ? (
            <FinishedState />
          ) : isClaimed ? (
            <ClaimedState />
          ) : proofBook?.getProofBookByWallet?.address ? (
          <WhitelistState />
          ) :
          <WithoutAudioState />
          }
        </div>
      </main>
    </>
  );
}
