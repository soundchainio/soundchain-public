import WalletConnectProvider from '@walletconnect/web3-provider';
import { Button } from 'components/Button';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { config } from 'config';
import Decimal from 'decimal.js';
import { useLayoutContext } from 'hooks/useLayoutContext';
import {
  useAudioHolderByWalletLazyQuery,
  useUpdateOgunClaimedAudioHolderMutation,
  useUpdateOgunClaimedWhitelistMutation,
  useWhitelistEntryByWalletLazyQuery,
} from 'lib/graphql';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Web3 from 'web3';

export default function AirdropPage() {
  const { setIsLandingLayout } = useLayoutContext();
  const [whitelistEntryByWallet, { data: whitelistEntry, loading: loadingWhitelist }] =
    useWhitelistEntryByWalletLazyQuery();
  const [audioHolderByWallet, { data: audioHolder, loading: loadingAudioHolder }] = useAudioHolderByWalletLazyQuery();
  const [updateOgunClaimedAudio] = useUpdateOgunClaimedAudioHolderMutation();
  const [updateOgunClaimedWhitelist] = useUpdateOgunClaimedWhitelistMutation();
  const [account, setAccount] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [closeModal, setCloseModal] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const minimunAudioToken = new Decimal('10');

  //correct amount at mobile

  useEffect(() => {
    if (account) {
      whitelistEntryByWallet({ variables: { walletAdress: account } });
      audioHolderByWallet({ variables: { walletAdress: account } });
    }
  }, [account, audioHolderByWallet, whitelistEntryByWallet]);

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  const isOgunClaimedWhitelist = Boolean(whitelistEntry?.whitelistEntryByWallet.ogunClaimed);
  const isOgunClaimedAudioHolder = Boolean(audioHolder?.audioHolderByWallet?.ogunClaimed);
  const audioBalance = new Decimal(audioHolder?.audioHolderByWallet?.amount || '0');
  const audioBalanceSize = audioBalance.toString().length;

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
      const accounts = await web3.eth?.getAccounts();
      if (accounts) setAccount(accounts[0]); // get the primary account
    } catch (error) {
      setCloseModal(!closeModal);
      console.warn('warn: ', error);
    }
    setLoading(false);
  };

  const handleClainOgun = async () => {
    try {
      if (audioHolder && !isOgunClaimedAudioHolder) {
        await updateOgunClaimedAudio({
          variables: { input: { id: audioHolder?.audioHolderByWallet.id, ogunClaimed: true } },
        });
      }
      if (whitelistEntry && !isOgunClaimedWhitelist) {
        await updateOgunClaimedWhitelist({
          variables: { input: { id: whitelistEntry?.whitelistEntryByWallet.id, ogunClaimed: true } },
        });
      }

      setIsFinished(true);
    } catch (error) {
      console.warn('warn: ', error);
    }
  };

  const ConnectAccountState = () => {
    return (
      <>
        <div>
          <h1 className="text-center text-2xl md:text-5xl font-extrabold">
            Connect your <span className="green-blue-gradient-text-break">wallet</span>
          </h1>
          <h2 className="text-xl md:text-4xl text-center pt-6 font-light">
          If you are an existing SoundChain user,<br/>joined the whitelist, or had any AUDIO when<br/>we took a snapshop on June 20, connect<br/>your wallet to claim <span className="yellow-gradient-text font-bold">5,000 OGUN</span> 
          </h2>
        </div>
        <Button variant="rainbow" className="w-5/6" onClick={connectWC}>
          <span className="font-medium ">CONNECT</span>
        </Button>
      </>
    );
  };

  const AudioWhitelistState = () => {
    return (
      <>
        <h2 className="text-2xl md:text-4xl text-center font-light">
          Based on how much AUDIO you own, you are able to claim this much OGUN
        </h2>

        <h2 className="text-2xl md:text-4xl text-center font-medium flex items-center flex-col md:flex-row whitespace-pre-wrap">
          <span>
            {audioBalanceSize < 8 ? audioBalance.toString() : audioBalance.toString().substring(0, 8) + '...'}{' '}
            <span className="purple-blue-gradient-text-break">$AUDIO</span>
          </span>
          <span className="grow m-1 w-12  border-b border-white" />
          <span>
            50 <span className="green-blue-gradient-text-break">OGUN</span>
          </span>
        </h2>
        <h2 className="text-xl md:text-4xl text-center font-light">
          Also for joining the whitelist:{' '}
          <span className="font-medium">
            {' '}
            50 <span className="green-blue-gradient-text-break">OGUN</span>
          </span>
        </h2>
        <Button variant="rainbow" className="w-5/6" onClick={handleClainOgun}>
          <span className="font-medium ">CLAIM</span>
        </Button>
      </>
    );
  };

  const WhitelistState = () => {
    return (
      <>
        <h2 className="text-2xl md:text-4xl text-center font-light">Thanks for joining the Whitelist</h2>
        <h2 className="text-2xl md:text-4xl text-center font-medium">
          50 <span className="green-blue-gradient-text-break">OGUN</span>
        </h2>
        <Button variant="rainbow" className="w-5/6" onClick={handleClainOgun}>
          <span className="font-medium ">CLAIM</span>
        </Button>
      </>
    );
  };

  const AudioState = () => {
    return (
      <>
        <h2 className="text-2xl md:text-4xl text-center font-light">
          Based on how much AUDIO you own, you are able to claim this much OGUN
        </h2>
        <h2 className="text-2xl md:text-4xl text-center font-medium flex items-center flex-col md:flex-row whitespace-pre-wrap">
          <span>
            {audioBalanceSize < 8 ? audioBalance.toString() : audioBalance.toString().substring(0, 8) + '...'}{' '}
            <span className="purple-blue-gradient-text-break">$AUDIO</span>
          </span>
          <span className="grow m-1 w-12  border-b border-white" />
          <span>
            50 <span className="green-blue-gradient-text-break">OGUN</span>
          </span>
        </h2>
        <Button variant="rainbow" className="w-5/6">
          <span className="font-medium ">CLAIM</span>
        </Button>
      </>
    );
  };

  const WithoutAudioState = () => {
    return (
      <h2 className="text-2xl md:text-4xl text-center pt-6 font-light">
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
        <h2 className="text-2xl md:text-4xl text-center font-light">
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
        <h2 className="text-2xl md:text-4xl text-center font-light">
          Thanks for claiming your <span className="green-blue-gradient-text-break">OGUN</span>
        </h2>
        <Button variant="rainbow" className="w-5/6">
          <span className="font-medium ">SoundChain Community</span>
        </Button>
      </>
    );
  };

  const ClosedState = () => {
    return (
      <>
        <h2 className="text-2xl md:text-4xl text-center pt-6 font-light">
          Sorry, the Airdrop is closed. You can{' '}
          <Link href="/">
            <a className="green-blue-gradient-text-break font-medium">get OGUN here.</a>
          </Link>
        </h2>
      </>
    );
  };

  return (
    <main className="flex items-center justify-center font-rubik text-white w-full h-full py-32">
      <div className="max-w-3xl flex flex-col gap-y-12 items-center justify-center pb-0 md:pb-40">
        {!config.airdropStatus ? (
          <ClosedState />
        ) : !account ? (
          <ConnectAccountState />
        ) : loading || loadingWhitelist || loadingAudioHolder ? (
          <LoaderAnimation loadingMessage="Loading" />
        ) : isFinished ? (
          <FinishedState />
        ) : isClaimed ? (
          <ClaimedState />
        ) : audioBalance.gte(minimunAudioToken) &&
          whitelistEntry &&
          !isOgunClaimedAudioHolder &&
          !isOgunClaimedWhitelist ? (
          <AudioWhitelistState />
        ) : (audioBalance.lt(minimunAudioToken) || isOgunClaimedAudioHolder) &&
          whitelistEntry &&
          !isOgunClaimedWhitelist ? (
          <WhitelistState />
        ) : audioBalance.gte(minimunAudioToken) &&
          !isOgunClaimedAudioHolder &&
          (!whitelistEntry || isOgunClaimedWhitelist) ? (
          <AudioState />
        ) : (
          <WithoutAudioState />
        )}
      </div>
    </main>
  );
}
