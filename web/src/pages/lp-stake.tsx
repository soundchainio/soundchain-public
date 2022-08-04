import { Button } from 'components/Button';
import { WalletButton } from 'components/Buttons/WalletButton';
import { config } from 'config';
import { Form, Formik } from 'formik';
import { useLayoutContext } from 'hooks/useLayoutContext';
import useMetaMask from 'hooks/useMetaMask';
import { useWalletConnect } from 'hooks/useWalletConnect';
import { CirclePlusFilled } from 'icons/CirclePlusFilled';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { WalletConnect } from 'icons/WalletConnect';
import { testnetNetwork } from 'lib/blockchainNetworks';
import { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Web3 from 'web3';
import { Contract } from "web3-eth-contract";
import { AbiItem } from 'web3-utils';
import { CustomModal } from '../components/CustomModal';
import LiquidityPoolRewards from '../contract/LiquidityPoolRewards.sol/LiquidityPoolRewards.json';
import LPToken from '../contract/LPToken.sol/LPToken.json';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import { GetServerSideProps } from 'next';

interface FormValues {
  token: string;
  amount: number;
}

type Selected = 'Stake' | 'Unstake';

const OGUNAddress = config.OGUNAddress as string;
const lpTokenAddress = config.lpTokenAddress as string;
const lpStakeContractAddress = config.lpStakeContractAddress as string;
const tokenContract = (web3: Web3) =>
  new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress) as unknown as Contract;
const lpContract = (web3: Web3) =>
  new web3.eth.Contract(LPToken.abi as AbiItem[], lpTokenAddress) as unknown as Contract;
const lpStakeContract = (web3: Web3) =>
  new web3.eth.Contract(LiquidityPoolRewards.abi as AbiItem[], lpStakeContractAddress)as unknown as Contract;

// TODO: remove before enabling the ogun token stake
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  if (res) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
}

export default function Stake() {
  const { 
    connect: wcConnect, 
    disconnect: wcDisconnect, 
    account: walletconnectAccount,
    web3: wcWeb3
  } = useWalletConnect();
  const {
    web3: metamaskWeb3,
  } = useMetaMask();
  const { setIsLandingLayout } = useLayoutContext();
  const [account, setAccount] = useState<string>();
  const [OGUNBalance, setOGUNBalance] = useState<string>('0');
  const [lpSelected, setLpSelected] = useState<Selected>('Stake');
  const [lpTransactionState, setLpTransactionState]= useState<string>();
  const [rewardsBalance, setRewardsBalance] = useState<string>('0');
  const [lpBalance, setLpBalance] = useState<string>('0');
  const [lpStakeBalance, setLpStakeBalance] = useState<string>('0');
  const [showModal, setShowModal] = useState(false);
  const [closeWcModal, setCloseWcModal] = useState(false);
  const [web3, setWeb3] = useState<Web3>();
  const [showDescription, setShowDescription] = useState(false);
  
  useEffect(()=> {
    const loadAccount = () => {
      setAccount(walletconnectAccount);
      setWeb3(wcWeb3);
    }
    if (walletconnectAccount && wcWeb3) {
      loadAccount();
    }
  }, [walletconnectAccount, wcWeb3]);

  useEffect(()=> {
    return () => {
      try {
        wcDisconnect();
      } catch (error) {
        console.warn('warn: ', error);
      } finally {
        setCloseWcModal(!closeWcModal);
      }
    }
  },[])

  const connectMetaMask = () => {
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
      } else if (!process.env.production) {
        provider = new Web3.providers.HttpProvider(testnetNetwork.rpc);
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

    setShowModal(false);
    setWeb3(metamaskWeb3);
  }
  
  const connectWC = async () => {
    try {
      await wcConnect();
    } catch (error) {
      console.warn('warn: ', error);
    } finally {
      setCloseWcModal(!closeWcModal);
    }
  };

  const addWallet = async () => {
    try {
      await wcDisconnect();
    } catch (error) {
      console.warn('warn: ', error);
    } finally {
      setShowModal(true);
    }
  }

  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call();
    const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
    setOGUNBalance(formattedBalance);
  }

  const getLPBalance = async (web3: Web3) => {
    const currentBalance = await lpContract(web3).methods.balanceOf(account).call();
    const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
    setLpBalance(formattedBalance);
  }
  
  const getLpStakeBalance = async (web3: Web3) => {
    try {
      const currentBalance = await lpStakeContract(web3).methods.getBalanceOf(account).call();
      const formattedLPBalance = web3.utils.fromWei(currentBalance[0] ?? '0');
      const formattedRewardsBalance = web3.utils.fromWei(currentBalance[1] ?? '0');
      setLpStakeBalance(formattedLPBalance);
      setRewardsBalance(formattedRewardsBalance);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      if (cause.toString().includes('address hasn\'t stake any tokens yet')) {
        setLpStakeBalance('0');
        setRewardsBalance('0');
        return;
      };
      console.log(cause);
    }
  }

  const lpStake = async (values: FormValues) => {
    if (values.amount <= 0) {
      toast('The amount to stake has to be higher than 0.');
      return;
    }
    if (values.amount > +lpBalance) {
      toast('You can\'t stake an mount higher than your current LP balance.');
      return;
    }
    if (account && web3) {
      try {
        const weiAmount = web3.utils.toWei(values.amount.toString());
        setLpTransactionState('Approving transaction...');
        await lpContract(web3).methods.approve(lpStakeContractAddress, weiAmount).send({from:account});
        setLpTransactionState('Staking OGUN/MATIC...');
        await lpStakeContract(web3).methods.stake(weiAmount).send({from:account});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (cause: any) {
        console.log('Stake Error: ', cause);
      } finally {
        setLpTransactionState(undefined);
      }
    }
  }

  const lpUnstake = async () => {
    if (lpStakeBalance === '0') {
      toast('Your stake LP balance is 0.');
      return;
    }
    if (account && web3) {
      try {
        setLpTransactionState('Unstaking OGUN/MATIC...');
        await lpStakeContract(web3).methods.withdraw().send({from:account});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (cause: any) {
        console.log('Unstake Error: ', cause);
      } finally {
        setLpTransactionState(undefined);
      }
    }
  }

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  useEffect(() => {
    if (account && web3 && !lpTransactionState) {
      getLPBalance(web3);
      getLpStakeBalance(web3);
      getOGUNBalance(web3);
    }
  }, [account, lpTransactionState]);

  const ConnectAccountState = () => {
    return (
      <>
        <div className="max-w-3xl flex flex-col items-center justify-center gap-y-6">
          <StakeTitle/>
          <Button variant="rainbow" className="w-5/6">
            <span className="font-medium ">BUY OGUNS</span>
          </Button>
        </div>

        <div className="w-full px-6">
          <h1 className="font-bold pb-5">Stake</h1>
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between bg-gray-30 h-36 md:h-28 px-9 py-3 gap-y-3">
            <span>Connect Wallet to Stake</span>
            <Button variant="orange">
              <span className="font-medium" onClick={()=> setShowModal(true)}>
                CONNECT WALLET
              </span>
            </Button>
          </div>
        </div>
      </>
    );
  };
  const StakeDescription = () => {
    return (
      <div className="flex flex-col w-full items-center justify-center md:justify-between">

        <p> 
          To reward you for providing liquidity, we’re giving out OGUN to everyone who 
          temporarily swaps their MATIC and OGUN in at &nbsp;
          <span className="green-blue-diagonal-gradient-text-break">
            <a 
              href='https://quickswap.exchange/#/add/ETH/0x99Db69EEe7637101FA216Ab4A3276eBedC63e146' 
              target="_blank" 
              rel='noreferrer'
            >
              Quickswap
            </a>
          </span>.
        </p>
        <br/>
        <p>
          Once you add liquidity to our pool (you can do that &nbsp;
          <span className="green-blue-diagonal-gradient-text-break">
            <a 
              href='https://quickswap.exchange/#/add/ETH/0x99Db69EEe7637101FA216Ab4A3276eBedC63e146' 
              target="_blank" 
              rel='noreferrer'
            >
              here
            </a>
          </span>), 
          you’ll get an LP (liquidity pool) token in return. You can stake 
          that token right here as proof of the liquidity you provided.
        </p>
        <br/>
        <p>
          We give away a certain amount of OGUN per block in the blockchain. 
          This amount divided amongst everyone who is staked and what you get 
          is based on what you put in. The percentage of the total amount staked 
          is the percentage you earn out of all the staking rewards.
        </p>
        <br/>
        <p className='-ml-36 md:-ml-24'>
          The current rate per day is around <span className="green-blue-diagonal-gradient-text-break">1,000,000 OGUN</span>
        </p>
      </div>
    )
  }

  const StakeTitle = () => {
    return (
      <>
        <h1 className="text-center text-2xl md:text-5xl font-extrabold">
          We’re giving away &nbsp;
          <span className="green-blue-diagonal-gradient-text-break">
            1,000,000 OGUN
          </span> 
          &nbsp;today
        </h1>
      </>
    )
  }

  const StakeState = () => {
    return (
      <>
        <div className="max-w-3xl flex flex-col items-center justify-center gap-y-4">
          <StakeTitle/>
          <div className="flex gap-x-3">
            <Button variant="rainbow" className="w-5/6">
              <span className="font-medium ">GET LP</span>
            </Button>
            <button className="flex items-center gap-x-2 justify-center whitespace-nowrap bg-transparent border-transparent" onClick={addWallet}>
              <span className="font-medium pl-2">Change Wallet</span>
              <CirclePlusFilled />
            </button>
          </div>
        </div>

        <div className=" flex flex-grow flex-col w-full md:md:w-[30rem]">
          {lpTransactionState && (
            <div className="flex items-center bg-blue-500 text-white text-sm font-bold px-4 py-3" role="alert">
              <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z"/></svg>
              <p>{lpTransactionState}</p>
            </div> 
          )}
            
          <div className="flex flex-col items-center justify-center md:justify-between bg-gray-30 gap-y-8 w-full px-2 md:px-9 py-3 md:py-9">
            <header className="flex justify-start items-start gap-x-4 w-full">
              <button
                className={`bg-transparent border-transparent ${
                  lpSelected == 'Stake' && 'font-medium border-b-2 border-white'
                }`}
                onClick={() => setLpSelected('Stake')}
              >
                Stake
              </button>
              <button
                className={`bg-transparent border-transparent ${
                  lpSelected == 'Unstake' && 'font-medium border-b-2 border-white'
                }`}
                onClick={() => setLpSelected('Unstake')}
              >
                Unstake
              </button>
            </header>
            <Formik<FormValues> 
              initialValues={{ amount: lpSelected === 'Stake' ? 0 : +lpStakeBalance, token: '' }} 
              onSubmit={(values) => lpSelected === 'Stake' ? lpStake(values) : lpUnstake()}
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
                        <option value={1}>LP</option>
                      </select>
                      <span className="absolute top-3 left-2 pointer-events-none">
                        <Logo id="soundchain-wallet" height="8" width="8" />
                        <Matic id="matic-wallet" height="8" width="8"/>
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
                      readOnly = {lpSelected === 'Unstake'}
                    />
                    <button 
                      className="font-normal text-black border-transparent bg-white py-2 px-3 w-full md:w-3/12 h-10" 
                      type='submit'
                    >
                      {lpSelected.toUpperCase()}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
            <div className="flex flex-col gap-y-1 w-full text-xs text-white text-opacity-60">
              <span className="flex justify-between">
                <text>OGUN/MATIC in wallet:</text>
                <text>{lpBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>OGUN in wallet:</text>
                <text>{OGUNBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your stake:</text>
                <text>{lpStakeBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your OGUN rewards:</text>
                <text>{rewardsBalance}</text>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center md:justify-between gap-y-8 w-full py-3 md:py-9">
            <button className='border-b-2 border-white' onClick={()=> setShowDescription(!showDescription)}>
                Find out how it works
            </button>
            {showDescription && <StakeDescription/>}
          </div>
        </div>
      </>
    );
  };

  return (
    <main className="flex flex-col gap-y-20 md:gap-y-32 items-center font-rubik text-white h-full pt-32">
      {account ? <StakeState /> : <ConnectAccountState />}
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
      <CustomModal show={showModal} onClose={()=>setShowModal(false)}>
          <div className="bg-white w-96 p-6 rounded">
            <h1 className="font-bold text-2xl text-blue-500">
            CONNECT WALLET
            </h1>
            <p className="py-1 text-gray-500">
            Connect with one of our available wallet providers
            </p>
            <div className="my-4 space-y-3">
              <WalletButton caption="Metamask" icon={MetaMask} handleOnClick={connectMetaMask} />
              <WalletButton caption="WalletConnect" icon={WalletConnect} handleOnClick={connectWC} />
            </div>
          
          </div>
        </CustomModal>
    </main>
  );
}
