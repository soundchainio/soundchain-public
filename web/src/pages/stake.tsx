import WalletConnectProvider from '@walletconnect/web3-provider';
import { Button } from 'components/Button';
import { config } from 'config';
import { Form, Formik } from 'formik';
import { useLayoutContext } from 'hooks/useLayoutContext';
import useMetaMask from 'hooks/useMetaMask';
import { CirclePlusFilled } from 'icons/CirclePlusFilled';
import { Logo } from 'icons/Logo';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import StakingRewards from '../contract/StakingRewards.sol/StakingRewards.json';

interface FormValues {
  token: string;
  amount: string;
}

type Selected = 'Stake' | 'Unstake';


const OGUNAddress = config.OGUNAddress as string;
const tokenStakeContractAddress = config.tokenStakeContractAddress as string;
const tokenContract = (web3: Web3) =>
  new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress);// as unknown as Contract;
const tokenStakeContract = (web3: Web3) =>
  new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress);// as unknown as Contract;

export default function Stake() {
  const {
    account: metamaskAccount,
    balance: metamaskBalance,
    // connect,
    // chainId,
    // addMumbaiTestnet,
    // refetchBalance: refetchMetamaskBalance,
    // isRefetchingBalance: isRefetchingMetamaskBalance,
    web3,
  } = useMetaMask();
  const { setIsLandingLayout } = useLayoutContext();
  const [account, setAccount] = useState<string>();
  const [OGUNBalance, setOGUNBalance] = useState<string>();
  const [closeModal, setCloseModal] = useState<boolean>(true);
  const [selected, setSelected] = useState<Selected>('Stake');
  const [web3API, setWeb3API] = useState<Web3>();
  const [formattedOGUNBalance, setFormattedOGUNBalance] = useState<string>();


  // const formattedOGUNBalance = parseFloat(OGUNbalance ?? '0');
  // const formattedOGUNBalance = web3 ?? web3?.utils?.fromWei(OGUNbalance);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider: any = new WalletConnectProvider({
    rpc: {
      1: 'https://cloudflare-eth.com/', // https://ethereumnodes.com/
      137: 'https://polygon-rpc.com/', // https://docs.polygon.technology/docs/develop/network-details/network/
      // ...
    },
  });

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);


  useEffect(() => {
    const getStakeBalance = async () => {
      if (account && web3) {
        console.log('Get Stake Balance account && web3API');
        const currentBalance = await tokenContract(web3).methods.balanceOf(account).call();
        const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
        debugger
        setOGUNBalance(currentBalance);
        setFormattedOGUNBalance(formattedBalance);
      }
    }
    getStakeBalance();
  }, [account]);

  const connectWC = async () => {
    try {
      await provider.enable();
      const web3CW = new Web3(provider);
      const accounts = await web3CW.eth?.getAccounts();
      setWeb3API(web3CW);
      if (accounts) setAccount(accounts[0]); // get the primary account
    } catch (error) {
      setCloseModal(!closeModal);
      console.warn('warn: ', error);
    }
  };

  const disconnectWC = async () => {
    await provider.disconnect();
    console.log('Discconect');
  }

  const ConnectAccountState = () => {
    return (
      <>
        <div className="max-w-3xl flex flex-col items-center justify-center gap-y-6">
          <h1 className="text-center text-2xl md:text-5xl font-extrabold">
            Stake OGUN, earn up to <br />
            <span className="green-blue-gradient-text-break">213% APR</span>
          </h1>
          <Button variant="rainbow" className="w-5/6">
            <span className="font-medium ">BUY OGUNS</span>
          </Button>
        </div>

        <div className="w-full px-6">
          <h1 className="font-bold pb-5">Stake</h1>
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between bg-gray-30 h-36 md:h-28 px-9 py-3 gap-y-3">
            <span>Connect Wallet to Stake</span>
            <Button variant="orange">
              <span className="font-medium" onClick={connectWC}>
                CONNECT WALLET
              </span>
            </Button>
          </div>
        </div>
      </>
    );
  };

  const SteakState = () => {
    return (
      <>
        <div className="max-w-3xl flex flex-col items-center justify-center gap-y-6">
          <h1 className="text-center text-2xl md:text-5xl font-extrabold">Stake OGUN</h1>
          <div className="flex gap-x-3">
            <Button variant="rainbow" className="w-5/6">
              <span className="font-medium ">BUY OGUNS</span>
            </Button>
            <button className="flex items-center gap-x-2 justify-center whitespace-nowrap bg-transparent border-transparent" onClick={disconnectWC}>
              <span className="font-medium pl-2">Add wallet</span>
              <CirclePlusFilled />
            </button>
          </div>
        </div>

        <div className=" flex flex-grow flex-col w-full md:w-auto">
          <span className="flex gap-x-4">
            <h1 className="font-bold pb-5">Stake</h1> <h1 className="font-normal">0.0 OGUN</h1>
          </span>
          <div className="flex flex-col items-center justify-center md:justify-between bg-gray-30 gap-y-8 w-full px-2 md:px-9 py-3 md:py-9">
            <header className="flex justify-start items-start gap-x-4 w-full">
              <button
                className={`bg-transparent border-transparent ${
                  selected == 'Stake' && 'font-medium border-b-2 border-white'
                }`}
                onClick={() => setSelected('Stake')}
              >
                Stake
              </button>
              <button
                className={`bg-transparent border-transparent ${
                  selected == 'Unstake' && 'font-medium border-b-2 border-white'
                }`}
                onClick={() => setSelected('Unstake')}
              >
                Unstake
              </button>
            </header>
            <Formik<FormValues> initialValues={{ amount: '', token: '' }} onSubmit={() => console.log('test')}>
              <Form className="w-full h-full">
                <div className="flex flex-col md:flex-row gap-y-2 md:gap-y-0 items-center justify-start">
                  <div className="relative w-full md:w-5/12 h-10">
                    <select
                      className="bg-gray-25 text-gray-80 font-bold text-xs border-0 pl-8 w-full h-10"
                      name="Wallet"
                      id="wallet"
                    >
                      <option value={1}>OGUN</option>
                    </select>
                    <span className="absolute top-3 left-2 pointer-events-none">
                      <Logo id="soundchain-wallet" height="16" width="16" />
                    </span>
                  </div>
                  <input
                    name="amount"
                    id="amount"
                    type="number"
                    placeholder="Amount"
                    className="bg-gray-40 border-transparent w-full md:w-8/12 md:ml-2 h-10"
                  />
                  <button className="font-normal text-black border-transparent bg-white py-2 px-3 w-full md:w-3/12 h-10">
                    {selected.toUpperCase()}
                  </button>
                </div>
              </Form>
            </Formik>
            <div className="flex flex-col gap-y-1 w-full text-xs text-white text-opacity-60">
              <span className="flex justify-between">
                <text>OGUN in wallet:</text>
                <text>{formattedOGUNBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your stake:</text>
                <text>0.0 ($0.0)</text>
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <main className="flex flex-col gap-y-20 md:gap-y-32 items-center md:pb-80 font-rubik text-white h-full py-32">
      {account ? <SteakState /> : <ConnectAccountState />}
    </main>
  );
}
