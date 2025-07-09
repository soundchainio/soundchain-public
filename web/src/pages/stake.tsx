import { Button } from 'components/common/Buttons/Button'
import { WalletButton } from 'components/common/Buttons/WalletButton'
import { config } from 'config'
import { Form, Formik } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMagicContext } from 'hooks/useMagicContext'
import useMetaMask from 'hooks/useMetaMask'
import { useWalletConnect } from 'hooks/useWalletConnect'
import { CirclePlusFilled } from 'icons/CirclePlusFilled'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { WalletConnect } from 'icons/WalletConnect'
import { testnetNetwork } from 'lib/blockchainNetworks'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import { formatToCompactNumber } from 'utils/format'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { CustomModal } from '../components/CustomModal'
import LiquidityPoolRewards from '../contract/LiquidityPoolRewards.sol/LiquidityPoolRewards.json'
import LPToken from '../contract/LPToken.sol/LPToken.json'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import StakingRewards from '../contract/StakingRewards.sol/StakingRewards.json'

interface FormValues {
  token: string
  amount: number
}

type Selected = 'Stake' | 'Unstake'

const OGUNAddress = config.ogunTokenAddress as string
const tokenStakeContractAddress = config.tokenStakeContractAddress as string
const tokenContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress)
}
const tokenStakeContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress)
}
const LPAddress = config.lpTokenAddress as string
const LPtokenStakeContractAddress = config.lpStakeContractAddress as string
const tokenContractLP = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(LPToken.abi as AbiItem[], LPAddress)
}
const tokenStakeContractLP = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(LiquidityPoolRewards.abi as AbiItem[], LPtokenStakeContractAddress)
}

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
  const [account, setAccount] = useState('')
  const [OGUNBalance, setOGUNBalance] = useState('0')
  const [stakeBalance, setStakeBalance] = useState('0')
  const [ogunRewardBalance, setOgunRewardBalance] = useState('0')
  const [LPBalance, setLPBalance] = useState('0')
  const [LPStakeBalance, setLPStakeBalance] = useState('0')
  const [ogunRewardLPBalance, setOgunRewardLPBalance] = useState('0')
  const [selected, setSelected] = useState<Selected>('Stake')
  const [transactionState, setTransactionState] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [closeWcModal, setCloseWcModal] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [web3, setWeb3] = useState<Web3 | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null)
  const hasOgunRewardBalance = Number(ogunRewardBalance) > 0
  const hasOgunRewardLPBalance = Number(ogunRewardLPBalance) > 0

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
    setWeb3(metamaskWeb3 || null)
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
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call() as string | undefined
    const validBalance = currentBalance !== undefined && (typeof currentBalance === 'string' || typeof currentBalance === 'number')
      ? currentBalance.toString()
      : '0'
    const formattedBalance = web3.utils.fromWei(validBalance, 'ether')
    setOGUNBalance(formattedBalance)
  }

  const getLPBalance = async (web3: Web3) => {
    const currentBalanceLP = await tokenContractLP(web3).methods.balanceOf(account).call() as string | undefined
    const validBalance = currentBalanceLP !== undefined && (typeof currentBalanceLP === 'string' || typeof currentBalanceLP === 'number')
      ? currentBalanceLP.toString()
      : '0'
    const formattedBalanceLP = web3.utils.fromWei(validBalance, 'ether')
    setLPBalance(formattedBalanceLP)
  }

  const getRewardBalance = () => {
    const { token } = formRef.current.values

    if (token === 'lp') {
      return formatToCompactNumber(Number(ogunRewardLPBalance))
    }

    if (token === 'ogun') {
      return formatToCompactNumber(Number(ogunRewardBalance))
    }
  }

  const getStakeBalance = async (web3: Web3) => {
    try {
      const balanceData = await tokenStakeContract(web3).methods.getBalanceOf(account).call() as [string, string, string] | undefined
      if (!balanceData) {
        setStakeBalance('0')
        setOgunRewardBalance('0')
        return
      }
      const [stakedBalance] = balanceData
      const reward = await tokenStakeContract(web3).methods.getReward(account).call() as string | undefined
      const validStakedBalance = stakedBalance !== undefined && (typeof stakedBalance === 'string' || typeof stakedBalance === 'number')
        ? stakedBalance.toString()
        : '0'
      const validRewardBalance = reward !== undefined && (typeof reward === 'string' || typeof reward === 'number')
        ? reward.toString()
        : '0'
      const formattedStakedBalance = web3.utils.fromWei(validStakedBalance, 'ether')
      const formattedRewardBalance = web3.utils.fromWei(validRewardBalance, 'ether')
      setStakeBalance(formattedStakedBalance)
      setOgunRewardBalance(formattedRewardBalance)
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
      const balanceData = await tokenStakeContractLP(web3).methods.getBalanceOf(account).call() as [string, string] | undefined
      if (!balanceData) {
        setLPStakeBalance('0')
        return
      }
      const [stakedLP] = balanceData
      const validStakedLP = stakedLP !== undefined && (typeof stakedLP === 'string' || typeof stakedLP === 'number')
        ? stakedLP.toString()
        : '0'
      const formattedLPBalance = web3.utils.fromWei(validStakedLP, 'ether')
      setLPStakeBalance(formattedLPBalance)
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
      const currentLPReward = await tokenStakeContractLP(web3).methods.getReward(account).call() as string | undefined
      const validLPReward = currentLPReward !== undefined && (typeof currentLPReward === 'string' || typeof currentLPReward === 'number')
        ? currentLPReward.toString()
        : '0'
      const formattedLPBalance = web3.utils.fromWei(validLPReward, 'ether')
      setOgunRewardLPBalance(formattedLPBalance)
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
      toast('The amount to stake has to be greater than 0.')
      return
    }
    if (values.amount > +balance) {
      toast(`You can't stake an amount greater than your current ${tokenName} balance.`)
      return
    }
    if (account && web3 && values.amount > 0 && values.amount <= +balance) {
      try {
        const existingAllowance = await currentTokenContract(web3)
          .methods.allowance(account, stakingContractAddress)
          .call() as string | undefined
        const weiAmount = web3.utils.toWei(values.amount.toString(), 'ether')
        const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()

        if (existingAllowance && parseFloat(existingAllowance) < parseFloat(weiAmount)) {
          setTransactionState('Approving transaction...')
          const approvalTxObj = currentTokenContract(web3).methods.approve(stakingContractAddress, weiAmount)
          const approvalTxGas = await approvalTxObj.estimateGas({ from: account })
          await approvalTxObj.send({ from: account, gas: approvalTxGas.toString(), gasPrice })
        }

        setTransactionState(`Staking ${tokenName}...`)
        const stakeTxObj = currentTokenStakingContract(web3).methods.stake(weiAmount)
        const stakeTxGas = await stakeTxObj.estimateGas({ from: account })
        await stakeTxObj.send({ from: account, gas: stakeTxGas.toString(), gasPrice })
      } catch (error: unknown) {
        console.log('Stake Error: ', error)
      } finally {
        setTransactionState('')
      }
    }
  }

  const unstake = async (values: FormValues) => {
    const { token, amount } = values

    if (!token || !amount) return

    const isLPToken = token === 'lp'
    const currentStakeBalance = isLPToken ? +LPStakeBalance : +stakeBalance
    const currentTokenStakingContract = isLPToken ? tokenStakeContractLP : tokenStakeContract
    const tokenName = isLPToken ? 'OGUN LP' : 'OGUN'

    if (currentStakeBalance == 0) return
    if (account && web3) {
      try {
        setTransactionState(`Unstaking ${tokenName}...`)
        const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()

        const amountWei = web3.utils.toWei(String(amount), 'ether')

        const unstakeTxObj = currentTokenStakingContract(web3).methods.withdrawStake(amountWei)
        const unstakeTxGas = await unstakeTxObj.estimateGas({ from: account })
        await unstakeTxObj.send({ from: account, gas: unstakeTxGas.toString(), gasPrice })
      } catch (error: unknown) {
        console.log('Stake Error: ', error)
      } finally {
        setTransactionState('')
      }
    }
  }

  const handleClaimRewards = async (token: string) => {
    try {
      if (!account || !web3) return

      const isLPToken = token === 'lp'
      const tokenName = isLPToken ? 'OGUN LP' : 'OGUN'

      setTransactionState(`Claiming ${tokenName} rewards...`)
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()
      const currentTokenStakingContract = isLPToken ? tokenStakeContractLP : tokenStakeContract

      const rewardsTxObj = currentTokenStakingContract(web3).methods.withdrawRewards()
      const rewardsTxGas = await rewardsTxObj.estimateGas({ from: account })
      await rewardsTxObj.send({ from: account, gas: rewardsTxGas.toString(), gasPrice })
    } catch (error) {
      console.log('Claim rewards Error: ', error)
    } finally {
      setTransactionState('')
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
          <a
            href="https://legacy.quickswap.exchange/#/swap?inputCurrency=0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270&outputCurrency=0x45f1af89486aeec2da0b06340cd9cd3bd741a15c"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="rainbow" className="w-5/6">
              <text className="font-medium ">BUY OGUNS</text>
            </Button>
          </a>
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
          Phase 1 (30 days): <span className="green-blue-diagonal-gradient-text-break">2,000,000 </span> OGUN per
          day    (Current Phase)
          <br />
          Phase 2 (60 days): <span className="green-blue-diagonal-gradient-text-break">833,333 </span> OGUN per day
          <br />
          Phase 3 (150 days): <span className="green-blue-diagonal-gradient-text-break">312,500 </span> OGUN per
          day
          <br />
          Phase 4 (120 days): <span className="green-blue-diagonal-gradient-text-break">250,000 </span> OGUN per
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
           today
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
            <a
              href="https://legacy.quickswap.exchange/#/swap?inputCurrency=0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270&outputCurrency=0x45f1af89486aeec2da0b06340cd9cd3bd741a15c"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="rainbow" className="w-5/6" buttonClassName="p-2">
                <span className="font-medium">BUY OGUN</span>
              </Button>
            </a>
            <button
              className="flex items-center justify-center gap-x-2 whitespace-nowrap border-transparent bg-transparent"
              onClick={addWallet}
            >
              <span className="pl-2 font-medium">Change Wallet</span>
              <CirclePlusFilled />
            </button>
          </div>
        </div>

        <div className=" flex w-full flex-grow flex-col md:md:w-[40rem]">
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
                  selected === 'Stake' && 'border-b-2 border-white font-medium'
                }`}
                onClick={() => setSelected('Stake')}
              >
                Stake
              </button>
              <button
                className={`border-transparent bg-transparent ${
                  selected === 'Unstake' && 'border-b-2 border-white font-medium'
                }`}
                onClick={() => setSelected('Unstake')}
              >
                Unstake
              </button>
            </header>
            <Formik<FormValues>
              initialValues={{ amount: 0, token: 'ogun' }}
              onSubmit={values => (selected === 'Stake' ? stake(values) : unstake(values))}
              innerRef={formRef}
            >
              {({ values, handleChange, ...formikProps }) => (
                <Form className="h-full w-full" {...(formikProps as any)}>
                  <div className="flex flex-col">
                    <div className="flex flex-col items-center justify-start gap-y-2 md:flex-row md:gap-y-0">
                      <div className="relative h-10 w-full md:w-6/12">
                        <select
                          className="h-10 w-full border-0 bg-gray-25 pl-8 text-xs font-bold text-gray-80"
                          name="token"
                          id="token"
                          value={values.token}
                          onChange={handleChange}
                        >
                          <option selected value="ogun">
                            OGUN
                          </option>
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
                        value={values.amount || ''} // Updated to use values.amount
                        className="h-10 w-full border-transparent bg-gray-40 md:ml-2 md:w-9/12"
                        onChange={handleChange}
                      />
                      <button
                        className="h-10 w-full border-transparent bg-white py-2 px-3 font-normal text-black md:w-3/12"
                        type="submit"
                        disabled={Boolean(transactionState)}
                      >
                        {selected.toUpperCase()}
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
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
