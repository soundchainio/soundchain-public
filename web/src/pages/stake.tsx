import { Button } from 'components/Button';
import { config } from 'config';
import { Form, Formik } from 'formik';
import { useLayoutContext } from 'hooks/useLayoutContext';
import useMetaMask from 'hooks/useMetaMask';
import { CirclePlusFilled } from 'icons/CirclePlusFilled';
import { Logo } from 'icons/Logo';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { Contract } from "web3-eth-contract";
import { AbiItem } from 'web3-utils';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import StakingRewards from '../contract/StakingRewards.sol/StakingRewards.json';

interface FormValues {
  token: string;
  amount: number;
}

type Selected = 'Stake' | 'Unstake';


const OGUNAddress = config.OGUNAddress as string;
const tokenStakeContractAddress = config.tokenStakeContractAddress as string;
const tokenContract = (web3: Web3) =>
  new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress) as unknown as Contract;
const tokenStakeContract = (web3: Web3) =>
  new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress)as unknown as Contract;

export default function Stake() {
  const {
    web3,
  } = useMetaMask();
  const { setIsLandingLayout } = useLayoutContext();
  const [account, setAccount] = useState<string>();
  const [OGUNBalance, setOGUNBalance] = useState<string>();
  const [stakeBalance, setStakeBalance] = useState<string>('0');
  const [selected, setSelected] = useState<Selected>('Stake');
  const [transactionState, setTransactionState]= useState<string>();

  const connectWC = () => {
    // Metamask Wallet;
    const loadProvider = async () => {
      let provider = null;

      if (window.ethereum) {
        provider = window.ethereum;
        try {
          await provider.request({method: 'eth_requestAccounts'});
        } catch (error) {
          console.warn(error);
        }
      } else if (window?.web3) {
        provider = window?.web3.currenProvider;
      } else if (!process.env.production) {
        provider = new Web3.providers.HttpProvider('https://rpc-mumbai.matic.today');
      }
      const web3API = new Web3(provider);
      const accounts = await web3API.eth.getAccounts();
      setAccount(accounts[0]);
    }
 
    const loadMetaMaskProvider = async (web3: Web3) => { 
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
    }

    (!web3) ? loadProvider() : loadMetaMaskProvider(web3);
  };

  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call();
    const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
    setOGUNBalance(formattedBalance);
  }

  const getStakeBalance = async (web3: Web3) => {
    try {
      const currentBalance = await tokenStakeContract(web3).methods.getBalanceOf(account).call();
      const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
      setStakeBalance(formattedBalance);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      const error = JSON.parse(cause.toString().slice(31).trim());
      if (error.message === 'execution reverted: address hasn\'t stake any tokens yet') return;
      console.warn(error.message);
    }
  }

  const stake = async (values: FormValues) => {
    if (account && web3) {
      const weiAmount = web3.utils.toWei(values.amount.toString());
      setTransactionState('Approving transaction...');
      await tokenContract(web3).methods.approve(tokenStakeContractAddress, weiAmount).send({from:account});
      setTransactionState('Staking OGUN...');
      await tokenStakeContract(web3).methods.stake(weiAmount).send({from:account});
      setTransactionState(undefined);
    }
  }

  const unstake = async () => {
    if (account && web3) {
      setTransactionState('Unstaking OGUN...');
      await tokenStakeContract(web3).methods.withdraw().send({from:account});
      setTransactionState(undefined);
    }
  }

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  useEffect(() => {
    if (account && web3 && !transactionState) {
      getOGUNBalance(web3);
      getStakeBalance(web3);
    }
  }, [account, transactionState]);

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

  const StakeState = () => {
    return (
      <>
        <div className="max-w-3xl flex flex-col items-center justify-center gap-y-6">
          <h1 className="text-center text-2xl md:text-5xl font-extrabold">Stake OGUN</h1>
          <div className="flex gap-x-3">
            <Button variant="rainbow" className="w-5/6">
              <span className="font-medium ">BUY OGUNS</span>
            </Button>
            <button className="flex items-center gap-x-2 justify-center whitespace-nowrap bg-transparent border-transparent">
              <span className="font-medium pl-2">Add wallet</span>
              <CirclePlusFilled />
            </button>
          </div>
        </div>

        

        <div className=" flex flex-grow flex-col w-full md:w-auto">
          {transactionState && (
            <div className="flex items-center bg-blue-500 text-white text-sm font-bold px-4 py-3" role="alert">
              <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z"/></svg>
              <p>{transactionState}</p>
            </div> 
          )}
            
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
            <Formik<FormValues> 
              initialValues={{ amount: selected === 'Stake' ? 0 : +stakeBalance, token: '' }} 
              onSubmit={(values) => selected === 'Stake' ? stake(values) : unstake()}
            >
              {({
                values,
                handleChange
              }) => (
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
                      value={values.amount}
                      onChange={handleChange}
                      readOnly = {selected === 'Unstake'}
                    />
                    <button 
                      className="font-normal text-black border-transparent bg-white py-2 px-3 w-full md:w-3/12 h-10" 
                      type='submit'
                    >
                      {selected.toUpperCase()}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
            <div className="flex flex-col gap-y-1 w-full text-xs text-white text-opacity-60">
              <span className="flex justify-between">
                <text>OGUN in wallet:</text>
                <text>{OGUNBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your stake:</text>
                <text>{stakeBalance}</text>
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <main className="flex flex-col gap-y-20 md:gap-y-32 items-center md:pb-80 font-rubik text-white h-full py-32">
      {account ? <StakeState /> : <ConnectAccountState />}
    </main>
  );
}
