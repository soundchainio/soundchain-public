import { Button } from 'components/Button'
import { WalletButton } from 'components/Buttons/WalletButton'
import { config } from 'config'
import { Form, Formik } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import useMetaMask from 'hooks/useMetaMask'
import { useWalletConnect } from 'hooks/useWalletConnect'
import { CirclePlusFilled } from 'icons/CirclePlusFilled'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { WalletConnect } from 'icons/WalletConnect'
import { testnetNetwork } from 'lib/blockchainNetworks'
import { GetServerSideProps } from 'next'
import { useEffect, useState } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { CustomModal } from '../components/CustomModal'
import LiquidityPoolRewards from '../contract/LiquidityPoolRewards.sol/LiquidityPoolRewards.json'
import LPToken from '../contract/LPToken.sol/LPToken.json'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import StakingRewards from '../contract/StakingRewards.sol/StakingRewards.json'
import { useMagicContext } from 'hooks/useMagicContext'
import useBlockchain from 'hooks/useBlockchain'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { useRouter } from 'next/router'

interface FormValues {
  token: string
  amount: number
}

type Selected = 'Stake' | 'Unstake'

const OGUNAddress = config.OGUNAddress as string
const tokenStakeContractAddress = config.tokenStakeContractAddress as string
const tokenContract = (web3: Web3) =>
  new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress) as unknown as Contract
const tokenStakeContract = (web3: Web3) =>
  new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress) as unknown as Contract
const LPAddress = config.lpTokenAddress as string
const LPtokenStakeContractAddress = config.lpStakeContractAddress as string
const tokenContractLP = (web3: Web3) =>
  new web3.eth.Contract(LPToken.abi as AbiItem[], LPAddress) as unknown as Contract
const tokenStakeContractLP = (web3: Web3) =>
  new web3.eth.Contract(LiquidityPoolRewards.abi as AbiItem[], LPtokenStakeContractAddress) as unknown as Contract

// TODO: remove before enabling the ogun token stake
export const getServerSideProps: GetServerSideProps = ({ res }) => {
  if (res) {
    res.statusCode = 404
    res.end('Not found')
  }

  return Promise.resolve({
    props: {},
  })
}

export default function Stake() {
  const router = useRouter()

  const {
    connect: wcConnect,
    disconnect: wcDisconnect,
    account: walletconnectAccount,
    web3: wcWeb3,
  } = useWalletConnect()

  const { web3: magicLinkWeb3, account: magicLinkAccount } = useMagicContext()
  const { web3: metamaskWeb3, account: metamaskAccount } = useMetaMask()
  const { getCurrentGasPrice } = useBlockchain()
  const { setIsLandingLayout } = useLayoutContext()
  const [account, setAccount] = useState<string>()
  const [OGUNBalance, setOGUNBalance] = useState<string>('0')
  const [stakeBalance, setStakeBalance] = useState<string>('0')
  const [ogunRewardBalance, setOgunRewardBalance] = useState<string>('0')
  const [LPBalance, setLPBalance] = useState<string>('0')
  const [LPStakeBalance, setLPStakeBalance] = useState<string>('0')
  const [ogunRewardLPBalance, setOgunRewardLPBalance] = useState<string>('0')
  const [selected, setSelected] = useState<Selected>('Stake')
  const [transactionState, setTransactionState] = useState<string>()
  const [showModal, setShowModal] = useState(false)
  const [closeWcModal, setCloseWcModal] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [web3, setWeb3] = useState<Web3>()

  const saveWalletState = (wallet: string) => {
    localStorage.setItem('soundchain_staking_connected_wallet', wallet)
  }

  const getWalletState = () => {
    return localStorage.getItem('soundchain_staking_connected_wallet')
  }

  useEffect(() => {
    const connectedWallet = getWalletState()

    const loadAccount = ({ account, web3 }: { account: string; web3: Web3 }) => {
      setAccount(account)
      setWeb3(web3)
    }

    if (walletconnectAccount && wcWeb3 && connectedWallet === 'wc') {
      console.log('loading WC...')
      loadAccount({ account: walletconnectAccount, web3: wcWeb3 })
    } else if (metamaskAccount && metamaskWeb3 && connectedWallet === 'metamask') {
      console.log('loading MetaMask...')
      loadAccount({ account: metamaskAccount, web3: metamaskWeb3 })
    } else if (magicLinkAccount && magicLinkWeb3 && connectedWallet === 'magiclink') {
      console.log('loading Soundchain Wallet...')
      loadAccount({ account: magicLinkAccount, web3: magicLinkWeb3 })
    }
  }, [walletconnectAccount, metamaskAccount, magicLinkAccount, wcWeb3, metamaskWeb3, magicLinkWeb3])

  useEffect(() => {
    return () => {
      // wcDisconnect();
    }
  }, [])

  const connectMetaMask = () => {
    // Metamask Wallet;
    const loadProvider = async () => {
      let provider = null

      if (window.ethereum) {
        provider = window.ethereum
        try {
          await provider.request({ method: 'eth_requestAccounts' })
        } catch (error) {
          console.warn(error)
        }
      } else if (!process.env.production) {
        provider = new Web3.providers.HttpProvider(testnetNetwork.rpc)
      }
      const web3API = new Web3(provider)
      const accounts = await web3API.eth.getAccounts()
      setAccount(accounts[0])
    }

    const loadMetaMaskProvider = async (web3: Web3) => {
      const accounts = await web3.eth.getAccounts()
      setAccount(accounts[0])
    }

    !web3 ? loadProvider() : loadMetaMaskProvider(web3)

    setShowModal(false)
    setWeb3(metamaskWeb3)
    saveWalletState('metamask')
  }

  const connectWC = async () => {
    try {
      await wcConnect()
      saveWalletState('wc')
    } catch (error) {
      console.warn('warn: ', error)
    } finally {
      setCloseWcModal(!closeWcModal)
    }
  }

  const connectSoundchain = () => {
    if (!magicLinkWeb3 || !magicLinkAccount) return router.push(`/login?callbackUrl=${parent.location.href}`)
    setShowModal(false)
    setAccount(magicLinkAccount)
    setWeb3(magicLinkWeb3)
    saveWalletState('magiclink')
  }

  const addWallet = async () => {
    try {
      await wcDisconnect()
    } catch (error) {
      console.warn('warn: ', error)
    } finally {
      setShowModal(true)
    }
  }

  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call()
    const formattedBalance = web3.utils.fromWei(currentBalance ?? '0')
    setOGUNBalance(formattedBalance)
  }

  const getLPBalance = async (web3: Web3) => {
    const currentBalanceLP = await tokenContractLP(web3).methods.balanceOf(account).call()
    const formattedBalanceLP = web3.utils.fromWei(currentBalanceLP ?? '0')
    setLPBalance(formattedBalanceLP)
  }

  const getStakeBalance = async (web3: Web3) => {
    try {
      const {
        0: stakedBalance,
        // 1: rewardBalance,
        // 2: newRewardBalance
      } = await tokenStakeContract(web3).methods.getBalanceOf(account).call()
      const reward = await tokenStakeContract(web3).methods.getReward(account).call()
      const formattedStakedBalance = web3.utils.fromWei(stakedBalance ?? '0')
      const formattedRewardBalance = web3.utils.fromWei(reward ?? '0')
      setStakeBalance(formattedStakedBalance)
      setOgunRewardBalance(formattedRewardBalance)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      if (cause.toString().includes("address hasn't stake any tokens yet")) {
        setStakeBalance('0')
        setOgunRewardBalance('0')
        return
      }
      console.log(cause)
    }
  }

  const getLPStakeBalance = async (web3: Web3) => {
    try {
      const { 0: stakedLP } = await tokenStakeContractLP(web3).methods.getBalanceOf(account).call()
      const formattedLPBalance = web3.utils.fromWei(stakedLP ?? '0')
      setLPStakeBalance(formattedLPBalance)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      if (cause.toString().includes("address hasn't stake any tokens yet")) {
        setLPStakeBalance('0')
        return
      }
      console.log(cause)
    }
  }

  const getStakingLPReward = async (web3: Web3) => {
    try {
      const currentLPReward = await tokenStakeContractLP(web3).methods.getReward(account).call()
      const formattedLPBalance = web3.utils.fromWei(currentLPReward.toString())
      setOgunRewardLPBalance(formattedLPBalance)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      if (cause.toString().includes("address hasn't staked any tokens yet")) {
        setOgunRewardLPBalance('0')
        return
      }
      console.log(cause)
    }
  }

  const stake = async (values: FormValues) => {
    const isLPToken = values.token === 'lp'
    const balance = isLPToken ? +LPBalance : +OGUNBalance
    const currentTokenContract = isLPToken ? tokenContractLP : tokenContract
    const currentTokenStakingContract = isLPToken ? tokenStakeContractLP : tokenStakeContract
    const stakingContractAddress = isLPToken ? LPtokenStakeContractAddress : tokenStakeContractAddress
    const tokenName = isLPToken ? 'OGUN LP' : 'OGUN'

    if (values.amount <= 0) {
      toast('The amount to stake has to be higher than 0.')
      return
    }
    if (values.amount > +balance) {
      toast(`You can't stake an amount higher than your current ${tokenName} balance.`)
      return
    }
    if (account && web3 && values.amount > 0 && values.amount <= +balance) {
      try {
        const existingAllowance = await currentTokenContract(web3)
          .methods.allowance(account, stakingContractAddress)
          .call()
          .catch(console.log)

        const weiAmount = web3.utils.toWei(values.amount.toString())
        const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3))

        if (existingAllowance < parseFloat(weiAmount)) {
          setTransactionState('Approving transaction...')
          const approvalTxObj = currentTokenContract(web3).methods.approve(stakingContractAddress, weiAmount)
          const approvalTxGas = await approvalTxObj.estimateGas({ from: account })
          await approvalTxObj.send({ from: account, gas: approvalTxGas, gasPrice })
        }

        setTransactionState(`Staking ${tokenName}...`)
        const stakeTxObj = currentTokenStakingContract(web3).methods.stake(weiAmount)
        const stakeTxGas = await stakeTxObj.estimateGas({ from: account })
        await stakeTxObj.send({ from: account, gas: stakeTxGas, gasPrice })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (cause: any) {
        console.log('Stake Error: ', cause)
      } finally {
        setTransactionState(undefined)
      }
    }
  }

  const unstake = async (values: FormValues) => {
    const isLPToken = values.token === 'lp'
    const currentStakeBalance = isLPToken ? +LPStakeBalance : +stakeBalance
    const currentTokenStakingContract = isLPToken ? tokenStakeContractLP : tokenStakeContract
    const tokenName = isLPToken ? 'OGUN LP' : 'OGUN'

    if (currentStakeBalance == 0) return
    if (account && web3) {
      try {
        setTransactionState(`Unstaking ${tokenName}...`)
        const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3))
        const unstakeTxObj = currentTokenStakingContract(web3).methods.withdraw()
        const unstakeTxGas = await unstakeTxObj.estimateGas({ from: account })
        await unstakeTxObj.send({ from: account, gas: unstakeTxGas, gasPrice })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (cause: any) {
        console.log('Stake Error: ', cause)
      } finally {
        setTransactionState(undefined)
      }
    }
  }

  useEffect(() => {
    setIsLandingLayout(true)

    return () => {
      setIsLandingLayout(false)
    }
  }, [setIsLandingLayout])

  useEffect(() => {
    if (account && web3 && !transactionState) {
      getStakingLPReward(web3)
      getOGUNBalance(web3)
      getLPBalance(web3)
      getStakeBalance(web3)
      getLPStakeBalance(web3)
    }
  }, [account, transactionState])

  const ConnectAccountState = () => {
    return (
      <>
        <div className="flex max-w-3xl flex-col items-center justify-center gap-y-6">
          <StakeTitle />
          <Button variant="rainbow" className="w-5/6">
            <span className="font-medium ">BUY OGUNS</span>
          </Button>
        </div>

        <div className="w-full px-6">
          <h1 className="pb-5 font-bold">Stake</h1>
          <div className="flex h-36 flex-col items-center justify-center gap-y-3 bg-gray-30 px-9 py-3 md:h-28 md:flex-row md:justify-between">
            <span>Connect Wallet to Stake</span>
            <Button variant="orange">
              <span className="font-medium" onClick={() => setShowModal(true)}>
                CONNECT WALLET
              </span>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const StakeDescription = () => {
    return (
      <div className="flex w-full flex-col items-center justify-center md:justify-between">
        <p>
          We give away a certain amount of OGUN per block in the blockchain. This amount divided amongst everyone who is
          staked and what you get is based on what you put in. The percentage of the total amount staked is the
          percentage you earn out of all the staking rewards.
        </p>
        <br />
        <p>
          We’ve broken the staking rewards up into phases, to really reward early adopters while giving out a lot of
          OGUN to everyone staking down the line. This is about how much it breaks down to per day
        </p>
        <br />
        <p>
          Phase 1 (30 days): <span className="green-blue-diagonal-gradient-text-break">2,000,000&nbsp;</span> OGUN per
          day &nbsp;&nbsp; (Current Phase)
          <br />
          Phase 2 (60 days): <span className="green-blue-diagonal-gradient-text-break">833,333&nbsp;</span> OGUN per day
          <br />
          Phase 3 (150 days): <span className="green-blue-diagonal-gradient-text-break">312,500&nbsp;</span> OGUN per
          day
          <br />
          Phase 4 (120 days): <span className="green-blue-diagonal-gradient-text-break">250,000&nbsp;</span> OGUN per
          day
        </p>
      </div>
    )
  }
  const StakeTitle = () => {
    return (
      <>
        <h1 className="text-center text-2xl font-extrabold md:text-5xl">We’re giving away</h1>
        <h1 className="text-center text-2xl font-extrabold md:text-5xl">
          <span className="green-blue-diagonal-gradient-text-break">2,000,000 OGUN</span>
          &nbsp;today
        </h1>
      </>
    )
  }

  const StakeState = () => {
    return (
      <>
        <div className="flex max-w-3xl flex-col items-center justify-center gap-y-6">
          <StakeTitle />
          <div className="flex gap-x-3">
            <Button variant="rainbow" className="w-5/6">
              <span className="font-medium ">BUY OGUNS</span>
            </Button>
            <button
              className="flex items-center justify-center gap-x-2 whitespace-nowrap border-transparent bg-transparent"
              onClick={addWallet}
            >
              <span className="pl-2 font-medium">Change Wallet</span>
              <CirclePlusFilled />
            </button>
          </div>
        </div>

        <div className=" flex w-full flex-grow flex-col md:md:w-[30rem]">
          {transactionState && (
            <div className="flex items-center bg-blue-500 px-4 py-3 text-sm font-bold text-white" role="alert">
              <svg className="mr-2 h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z" />
              </svg>
              <p>{transactionState}</p>
            </div>
          )}

          <div className="flex w-full flex-col items-center justify-center gap-y-8 bg-gray-30 px-2 py-3 md:justify-between md:px-9 md:py-9">
            <header className="flex w-full items-start justify-start gap-x-4">
              <button
                className={`border-transparent bg-transparent ${
                  selected == 'Stake' && 'border-b-2 border-white font-medium'
                }`}
                onClick={() => setSelected('Stake')}
              >
                Stake
              </button>
              <button
                className={`border-transparent bg-transparent ${
                  selected == 'Unstake' && 'border-b-2 border-white font-medium'
                }`}
                onClick={() => setSelected('Unstake')}
              >
                Unstake
              </button>
            </header>
            <Formik<FormValues>
              initialValues={{ amount: selected === 'Stake' ? 0 : +stakeBalance, token: 'ogun' }}
              onSubmit={values => (selected === 'Stake' ? stake(values) : unstake(values))}
            >
              {({ values, handleChange }) => {
                let { amount } = values
                if (selected === 'Unstake' && values.token === 'lp') amount = +LPStakeBalance

                return (
                  <Form className="h-full w-full">
                    <div className="flex flex-col items-center justify-start gap-y-2 md:flex-row md:gap-y-0">
                      <div className="relative h-10 w-full md:w-6/12">
                        <select
                          className="h-10 w-full border-0 bg-gray-25 pl-8 text-xs font-bold text-gray-80"
                          name="token"
                          id="token"
                          onChange={handleChange}
                        >
                          <option value="ogun">OGUN</option>
                          <option value="lp">OGUN-LP</option>
                        </select>
                        <span className="pointer-events-none absolute top-3 left-2">
                          <Logo id="soundchain-wallet" height="16" width="16" />
                        </span>
                      </div>
                      <input
                        name="amount"
                        id="amount"
                        type="number"
                        placeholder="Amount"
                        className="h-10 w-full border-transparent bg-gray-40 md:ml-2 md:w-8/12"
                        value={amount}
                        onChange={handleChange}
                        readOnly={selected === 'Unstake'}
                      />
                      <button
                        className="h-10 w-full border-transparent bg-white py-2 px-3 font-normal text-black md:w-3/12"
                        type="submit"
                      >
                        {selected.toUpperCase()}
                      </button>
                    </div>
                  </Form>
                )
              }}
            </Formik>
            <div className="flex w-full flex-col gap-y-1 text-xs text-white text-opacity-60">
              <span className="flex justify-between">
                <text>OGUN in wallet:</text>
                <text>{OGUNBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your staked OGUN:</text>
                <text>{stakeBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your OGUN staking rewards:</text>
                <text>{ogunRewardBalance}</text>
              </span>
            </div>
            <div className="flex w-full flex-col gap-y-1 text-xs text-white text-opacity-60">
              <span className="flex justify-between">
                <text>OGUN-LP in wallet:</text>
                <text>{LPBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your staked OGUN-LP:</text>
                <text>{LPStakeBalance}</text>
              </span>
              <span className="flex justify-between">
                <text>Your OGUN LP rewards:</text>
                <text>{ogunRewardLPBalance}</text>
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-y-8 py-3 md:justify-between md:py-9">
            <button className="border-b-2 border-white" onClick={() => setShowDescription(!showDescription)}>
              Find out how it works
            </button>
            {showDescription && <StakeDescription />}
          </div>
        </div>
      </>
    )
  }

  return (
    <main className="flex h-full flex-col items-center gap-y-20 pt-32 font-rubik text-white md:gap-y-32">
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
      <CustomModal show={showModal} onClose={() => setShowModal(false)}>
        <div className="w-96 rounded bg-white p-6">
          <h1 className="text-2xl font-bold text-blue-500">CONNECT WALLET</h1>
          <p className="py-1 text-gray-500">Connect with one of our available wallet providers</p>
          <div className="my-4 space-y-3">
            <WalletButton caption="Soundchain Wallet" icon={SoundchainGoldLogo} handleOnClick={connectSoundchain} />
            <WalletButton caption="Metamask" icon={MetaMask} handleOnClick={connectMetaMask} />
            <WalletButton caption="WalletConnect" icon={WalletConnect} handleOnClick={connectWC} />
          </div>
        </div>
      </CustomModal>
    </main>
  )
}
