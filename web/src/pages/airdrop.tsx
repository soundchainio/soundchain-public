import { Button } from 'components/Button';
import { useLayoutContext } from 'hooks/useLayoutContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AirdropPage() {
  const { setIsLandingLayout } = useLayoutContext();
  const [currentAudio, setCurrentAudio] = useState(1);
  const [isInWhitelist, setIsInInWhitelist] = useState(false);
  const [account, setAccount] = useState(true);
  const [isAirdropOpen, setIsAirdropOpen] = useState(true);
  const [isClaimed, setIsAudioClaimed] = useState(false);

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  const ConnectAccountState = () => {
    return (
      <>
        <div>
          <h1 className="text-center text-2xl md:text-5xl font-extrabold">
            Connect your <span className="green-blue-gradient-text-break">wallet</span>
          </h1>
          <h2 className="text-xl md:text-4xl text-center pt-6 font-light">
            Lorem ipsum dolor sit amet, consectetur <br /> adipiscing elit, sed do eiusmod tempor
          </h2>
        </div>
        <Button variant="rainbow" className="w-5/6">
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
        <h2 className="text-2xl md:text-4xl text-center font-medium flex items-center whitespace-pre-wrap">
          {currentAudio} <span className="purple-blue-gradient-text-break">$AUDIO</span>
          <span className="grow m-1 w-12  border-b border-white" />
          50{' '}
          <span className="green-blue-gradient-text-break">OGUN</span>
        </h2>
        <h2 className="text-xl md:text-4xl text-center font-light">
          Also for joining the whitelist:{' '}
          <span className="font-medium">
            {' '}
            50 <span className="green-blue-gradient-text-break">OGUN</span>
          </span>
        </h2>
        <Button variant="rainbow" className="w-5/6">
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
        <Button variant="rainbow" className="w-5/6">
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
        <h2 className="text-2xl md:text-4xl text-center font-medium flex items-center whitespace-pre-wrap">
          {currentAudio} <span className="purple-blue-gradient-text-break">$AUDIO</span>{' '}
          <span className="grow m-1 w-12  border-b border-white" />50{' '}
          <span className="green-blue-gradient-text-break">OGUN</span>
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

  if (!isAirdropOpen) {
    return (
      <main className="flex items-center justify-center font-rubik text-white w-full h-full py-32">
        <div className="max-w-3xl flex flex-col gap-y-12 items-center justify-center">
          <h2 className="text-2xl md:text-4xl text-center pt-6 font-light">
            Sorry, the Airdrop is closed. You can{' '}
            <Link href="/">
              <a className="green-blue-gradient-text-break font-medium">get OGUN here.</a>
            </Link>
          </h2>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center font-rubik text-white w-full h-full py-32">
      <div className="max-w-3xl flex flex-col gap-y-12 items-center justify-center">
        {!account ? (
          <ConnectAccountState />
        ) : isClaimed ? (
          <ClaimedState />
        ) : currentAudio && isInWhitelist ? (
          <AudioWhitelistState />
        ) : !currentAudio && isInWhitelist ? (
          <WhitelistState />
        ) : currentAudio && !isInWhitelist ? (
          <AudioState />
        ) : (
          <WithoutAudioState />
        )}
      </div>
    </main>
  );
}
