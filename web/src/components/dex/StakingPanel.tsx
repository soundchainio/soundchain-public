/**
 * OGUN Staking Panel - DEX Style
 * Stake OGUN tokens to earn rewards across multiple chains
 * + Streaming Rewards Aggregator for OGUN earnings from music plays
 */

import { useState, useEffect, useCallback } from 'react'
import { config } from 'config'
import { useMagicContext } from 'hooks/useMagicContext'
import { useWalletConnect } from 'hooks/useWalletConnect'
import useMetaMask from 'hooks/useMetaMask'
import useBlockchain from 'hooks/useBlockchain'
import { useMe } from 'hooks/useMe'
import { gql, useQuery, useMutation } from '@apollo/client'
import { toast } from 'react-toastify'
import { formatToCompactNumber } from 'utils/format'
import { TOKEN_ADDRESSES, QUICKSWAP_SWAP_URL, QUICKSWAP_ROUTER, SWAP_CONFIG } from 'constants/tokens'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import StakingRewards from 'contract/StakingRewards.sol/StakingRewards.json'
import UniswapV2Router from 'contract/UniswapV2Router/UniswapV2Router.json'
import { Coins, TrendingUp, Wallet, ArrowDownUp, Lock, Unlock, Gift, ExternalLink, Headphones, Sparkles, Award } from 'lucide-react'

// Query for user's streaming rewards
const GET_USER_STREAMING_REWARDS = gql`
  query GetUserStreamingRewards($profileId: String!) {
    scidsByProfile(profileId: $profileId) {
      id
      scid
      trackId
      streamCount
      ogunRewardsEarned
      ogunRewardsClaimed
      lastStreamAt
    }
  }
`

// Mutation to claim streaming rewards
const CLAIM_STREAMING_REWARDS = gql`
  mutation ClaimStreamingRewards($input: ClaimStreamingRewardsInput!) {
    claimStreamingRewards(input: $input) {
      success
      totalClaimed
      tracksCount
      staked
      transactionHash
      error
    }
  }
`

// Contract addresses
const OGUNAddress = config.ogunTokenAddress as string
const tokenStakeContractAddress = config.tokenStakeContractAddress as string

// Contract instances
const tokenContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress)
}
const tokenStakeContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress)
}
const routerContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(UniswapV2Router.abi as AbiItem[], QUICKSWAP_ROUTER)
}

// Chain explorers for staking transactions
const CHAIN_EXPLORERS: Record<string, string> = {
  'Polygon': 'https://polygonscan.com',
  'ZetaChain': 'https://explorer.zetachain.com',
  'Ethereum': 'https://etherscan.io',
  'Base': 'https://basescan.org',
}

interface StakingPanelProps {
  onClose?: () => void
}

export const StakingPanel = ({ onClose }: StakingPanelProps) => {
  const me = useMe()
  const { web3: magicLinkWeb3, account: magicLinkAccount, ogunBalance: magicOgunBalance } = useMagicContext()
  const { web3: metamaskWeb3, account: metamaskAccount } = useMetaMask()
  const { web3: wcWeb3, account: walletconnectAccount } = useWalletConnect()
  const { getCurrentGasPrice } = useBlockchain()

  const [web3, setWeb3] = useState<Web3 | null>(null)
  const [account, setAccount] = useState('')
  const [selectedChain, setSelectedChain] = useState('Polygon')
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'swap'>('stake')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [transactionState, setTransactionState] = useState('')
  const [showStreamingDetails, setShowStreamingDetails] = useState(false)

  // Balances
  const [ogunBalance, setOgunBalance] = useState('0')
  const [stakedBalance, setStakedBalance] = useState('0')
  const [rewardBalance, setRewardBalance] = useState('0')
  const [totalStaked, setTotalStaked] = useState('0')
  const [apr, setApr] = useState('0')

  // Swap state
  const [swapFromToken, setSwapFromToken] = useState<'POL' | 'OGUN'>('POL')
  const [swapAmount, setSwapAmount] = useState('')
  const [swapQuote, setSwapQuote] = useState<string | null>(null)
  const [swapQuoteLoading, setSwapQuoteLoading] = useState(false)
  const [slippage, setSlippage] = useState<number>(SWAP_CONFIG.DEFAULT_SLIPPAGE)
  const [polBalance, setPolBalance] = useState('0')

  // Fetch user's streaming rewards
  const { data: streamingData, loading: streamingLoading, refetch: refetchStreaming } = useQuery(
    GET_USER_STREAMING_REWARDS,
    {
      variables: { profileId: me?.profile?.id || '' },
      skip: !me?.profile?.id,
    }
  )

  // Claim streaming rewards mutation
  const [claimStreamingRewardsMutation, { loading: claimLoading }] = useMutation(CLAIM_STREAMING_REWARDS)

  // Calculate streaming totals
  const scids = streamingData?.scidsByProfile || []
  const streamingStats = {
    totalStreams: scids.reduce((acc: number, s: any) => acc + (s.streamCount || 0), 0),
    totalOgunEarned: scids.reduce((acc: number, s: any) => acc + (s.ogunRewardsEarned || 0), 0),
    // Calculate unclaimed as earned minus claimed
    totalUnclaimed: scids.reduce((acc: number, s: any) => {
      const earned = s.ogunRewardsEarned || 0
      const claimed = s.ogunRewardsClaimed || 0
      return acc + Math.max(0, earned - claimed)
    }, 0),
    tracksWithStreams: scids.filter((s: any) => s.streamCount > 0).length,
    topTracks: [...scids]
      .sort((a: any, b: any) => (b.ogunRewardsEarned || 0) - (a.ogunRewardsEarned || 0))
      .slice(0, 5),
  }

  // Handle claim to wallet
  const handleClaimToWallet = async () => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      const { data } = await claimStreamingRewardsMutation({
        variables: {
          input: {
            walletAddress: account,
            stakeDirectly: false,
          },
        },
      })

      if (data?.claimStreamingRewards?.success) {
        toast.success(`Successfully claimed ${data.claimStreamingRewards.totalClaimed.toFixed(2)} OGUN!`)
        refetchStreaming()
        fetchBalances()
      } else {
        toast.error(data?.claimStreamingRewards?.error || 'Claim failed')
      }
    } catch (err: any) {
      console.error('Claim error:', err)
      toast.error(err.message || 'Failed to claim rewards')
    }
  }

  // Handle stake rewards directly
  const handleStakeRewards = async () => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      const { data } = await claimStreamingRewardsMutation({
        variables: {
          input: {
            walletAddress: account,
            stakeDirectly: true,
          },
        },
      })

      if (data?.claimStreamingRewards?.success) {
        toast.success(`Successfully staked ${data.claimStreamingRewards.totalClaimed.toFixed(2)} OGUN from streaming!`)
        refetchStreaming()
        fetchBalances()
      } else {
        toast.error(data?.claimStreamingRewards?.error || 'Stake failed')
      }
    } catch (err: any) {
      console.error('Stake error:', err)
      toast.error(err.message || 'Failed to stake rewards')
    }
  }

  // Staking phases info
  const phases = [
    { phase: 1, days: 30, reward: '2,000,000', status: 'active' },
    { phase: 2, days: 60, reward: '833,333', status: 'upcoming' },
    { phase: 3, days: 150, reward: '312,500', status: 'upcoming' },
    { phase: 4, days: 120, reward: '250,000', status: 'upcoming' },
  ]

  // User's stored wallet address from profile (fallback for Magic session issues)
  // Check ALL OAuth wallet addresses, not just magicWalletAddress
  // Order: magic > google > discord > twitch > email
  const userWallet = me?.magicWalletAddress ||
                     me?.googleWalletAddress ||
                     me?.discordWalletAddress ||
                     me?.twitchWalletAddress ||
                     me?.emailWalletAddress

  // Load wallet - prefer connected wallets, fallback to user's stored wallet
  // Now supports balance fetching via public RPC even without Magic web3
  useEffect(() => {
    if (walletconnectAccount && wcWeb3) {
      setAccount(walletconnectAccount)
      setWeb3(wcWeb3)
      console.log('💳 Staking: Using WalletConnect:', walletconnectAccount)
    } else if (metamaskAccount && metamaskWeb3) {
      setAccount(metamaskAccount)
      setWeb3(metamaskWeb3)
      console.log('💳 Staking: Using MetaMask:', metamaskAccount)
    } else if (magicLinkAccount && magicLinkWeb3) {
      setAccount(magicLinkAccount)
      setWeb3(magicLinkWeb3)
      console.log('💳 Staking: Using Magic account:', magicLinkAccount)
    } else if (userWallet && magicLinkWeb3) {
      // Fallback: use stored wallet address with Magic web3
      console.log('💳 Staking: Using fallback wallet with Magic web3:', userWallet)
      setAccount(userWallet)
      setWeb3(magicLinkWeb3)
    } else if (userWallet) {
      // NEW: Set account even without web3 - fetchBalances will use public RPC
      console.log('💳 Staking: Using fallback wallet (public RPC for balances):', userWallet)
      setAccount(userWallet)
      // web3 stays null - fetchBalances will use public RPC
    }
  }, [walletconnectAccount, metamaskAccount, magicLinkAccount, wcWeb3, metamaskWeb3, magicLinkWeb3, userWallet])

  // Fetch balances - uses public RPC as fallback when Magic web3 isn't available
  const fetchBalances = useCallback(async () => {
    // Need account at minimum - can use public RPC for read-only calls
    if (!account) {
      console.log('StakingPanel: No account, skipping balance fetch')
      return
    }

    // Use Magic web3 if available, otherwise fallback to Alchemy Polygon RPC
    const web3Instance = web3 || new Web3(process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com')

    try {
      // POL (native) Balance
      try {
        const polBal = await web3Instance.eth.getBalance(account)
        setPolBalance(web3Instance.utils.fromWei(polBal, 'ether'))
        console.log('StakingPanel: POL balance fetched:', web3Instance.utils.fromWei(polBal, 'ether'))
      } catch (polErr) {
        console.error('StakingPanel: POL balance fetch failed:', polErr)
        setPolBalance('0')
      }

      // OGUN Balance - use public RPC, no chain check needed (we're always calling Polygon RPC)
      try {
        const ogunContract = tokenContract(web3Instance)
        const balance = await ogunContract.methods.balanceOf(account).call() as string
        const ogunBal = web3Instance.utils.fromWei(balance || '0', 'ether')
        setOgunBalance(ogunBal)
        console.log('StakingPanel: OGUN balance fetched:', ogunBal)
      } catch (balanceErr) {
        console.error('StakingPanel: OGUN balance fetch failed:', balanceErr)
        // Fallback to Magic context balance
        if (magicOgunBalance) {
          setOgunBalance(magicOgunBalance)
        } else {
          setOgunBalance('0')
        }
      }

      // Staked Balance & Rewards (read-only, can use public RPC)
      try {
        const stakeContract = tokenStakeContract(web3Instance)
        const balanceData = await stakeContract.methods.getBalanceOf(account).call() as [string, string, string]
        if (balanceData) {
          setStakedBalance(web3Instance.utils.fromWei(balanceData[0] || '0', 'ether'))
        }
        const reward = await stakeContract.methods.getReward(account).call() as string
        setRewardBalance(web3Instance.utils.fromWei(reward || '0', 'ether'))
      } catch (stakeErr) {
        console.error('StakingPanel: Staked balance fetch failed:', stakeErr)
        setStakedBalance('0')
        setRewardBalance('0')
      }

      // Total Staked (mock for now - would come from contract)
      setTotalStaked('45,000,000')
      setApr('125')
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }, [web3, account, magicOgunBalance])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // Stake OGUN
  const handleStake = async () => {
    if (!web3 || !account || !amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount to stake')
      return
    }

    // Calculate 0.05% platform fee
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = parseFloat(amount) * platformFeeRate
    const totalNeeded = parseFloat(amount) + platformFee

    if (totalNeeded > parseFloat(ogunBalance)) {
      toast.error(`Insufficient OGUN balance. Need ${totalNeeded.toFixed(6)} (${amount} + ${platformFee.toFixed(6)} fee)`)
      return
    }

    setIsLoading(true)
    try {
      const weiAmount = web3.utils.toWei(amount, 'ether')
      const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether')
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()
      const treasuryAddress = config.treasuryAddress

      // Step 1: Send platform fee to treasury (in OGUN)
      setTransactionState('Collecting platform fee...')
      console.log(`📤 Sending ${platformFee.toFixed(6)} OGUN fee to treasury: ${treasuryAddress}`)
      const feeTx = tokenContract(web3).methods.transfer(treasuryAddress, feeWei)
      const feeGas = await feeTx.estimateGas({ from: account })
      await feeTx.send({ from: account, gas: feeGas.toString(), gasPrice })
      console.log('✅ Platform fee sent to treasury')

      // Step 2: Check allowance
      const allowance = await tokenContract(web3).methods.allowance(account, tokenStakeContractAddress).call() as string
      if (parseFloat(allowance) < parseFloat(weiAmount)) {
        setTransactionState('Approving OGUN...')
        const approveTx = tokenContract(web3).methods.approve(tokenStakeContractAddress, weiAmount)
        const approveGas = await approveTx.estimateGas({ from: account })
        await approveTx.send({ from: account, gas: approveGas.toString(), gasPrice })
      }

      // Step 3: Stake
      setTransactionState('Staking OGUN...')
      const stakeTx = tokenStakeContract(web3).methods.stake(weiAmount)
      const stakeGas = await stakeTx.estimateGas({ from: account })
      await stakeTx.send({ from: account, gas: stakeGas.toString(), gasPrice })

      toast.success(`Successfully staked ${amount} OGUN! (fee: ${platformFee.toFixed(6)} OGUN)`)
      setAmount('')
      fetchBalances()
    } catch (error: any) {
      console.error('Stake error:', error)
      toast.error('Staking failed: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
      setTransactionState('')
    }
  }

  // Unstake OGUN (with 0.05% platform fee deducted from unstaked amount)
  const handleUnstake = async () => {
    if (!web3 || !account || !amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount to unstake')
      return
    }

    if (parseFloat(amount) > parseFloat(stakedBalance)) {
      toast.error('Amount exceeds staked balance')
      return
    }

    // Calculate 0.05% platform fee (deducted from unstaked amount)
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = parseFloat(amount) * platformFeeRate

    setIsLoading(true)
    try {
      const weiAmount = web3.utils.toWei(amount, 'ether')
      const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether')
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()
      const treasuryAddress = config.treasuryAddress

      // Step 1: Unstake
      setTransactionState('Unstaking OGUN...')
      const unstakeTx = tokenStakeContract(web3).methods.withdrawStake(weiAmount)
      const unstakeGas = await unstakeTx.estimateGas({ from: account })
      await unstakeTx.send({ from: account, gas: unstakeGas.toString(), gasPrice })

      // Step 2: Send platform fee to treasury (from newly unstaked OGUN)
      setTransactionState('Collecting platform fee...')
      console.log(`📤 Sending ${platformFee.toFixed(6)} OGUN fee to treasury: ${treasuryAddress}`)
      const feeTx = tokenContract(web3).methods.transfer(treasuryAddress, feeWei)
      const feeGas = await feeTx.estimateGas({ from: account })
      await feeTx.send({ from: account, gas: feeGas.toString(), gasPrice })
      console.log('✅ Platform fee sent to treasury')

      toast.success(`Successfully unstaked ${amount} OGUN! (fee: ${platformFee.toFixed(6)} OGUN)`)
      setAmount('')
      fetchBalances()
    } catch (error: any) {
      console.error('Unstake error:', error)
      toast.error('Unstaking failed: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
      setTransactionState('')
    }
  }

  // Claim Rewards (with 0.05% platform fee)
  const handleClaimRewards = async () => {
    if (!web3 || !account || parseFloat(rewardBalance) <= 0) {
      toast.error('No rewards to claim')
      return
    }

    // Calculate 0.05% platform fee (deducted from claimed amount)
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = parseFloat(rewardBalance) * platformFeeRate

    setIsLoading(true)
    try {
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()
      const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether')
      const treasuryAddress = config.treasuryAddress

      // Step 1: Claim rewards
      setTransactionState('Claiming rewards...')
      const claimTx = tokenStakeContract(web3).methods.withdrawRewards()
      const claimGas = await claimTx.estimateGas({ from: account })
      await claimTx.send({ from: account, gas: claimGas.toString(), gasPrice })

      // Step 2: Send platform fee to treasury (from newly claimed OGUN)
      setTransactionState('Collecting platform fee...')
      console.log(`📤 Sending ${platformFee.toFixed(6)} OGUN fee to treasury: ${treasuryAddress}`)
      const feeTx = tokenContract(web3).methods.transfer(treasuryAddress, feeWei)
      const feeGas = await feeTx.estimateGas({ from: account })
      await feeTx.send({ from: account, gas: feeGas.toString(), gasPrice })
      console.log('✅ Platform fee sent to treasury')

      const netClaimed = parseFloat(rewardBalance) - platformFee
      toast.success(`Successfully claimed ${formatToCompactNumber(netClaimed)} OGUN! (fee: ${platformFee.toFixed(6)} OGUN)`)
      fetchBalances()
    } catch (error: any) {
      console.error('Claim error:', error)
      toast.error('Claiming failed: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
      setTransactionState('')
    }
  }

  // Set max amount
  const handleSetMax = () => {
    if (activeTab === 'stake') {
      setAmount(ogunBalance)
    } else {
      setAmount(stakedBalance)
    }
  }

  // Set max for swap
  const handleSwapSetMax = () => {
    if (swapFromToken === 'POL') {
      // Leave some POL for gas (0.01 POL minimum)
      const maxPol = Math.max(0, parseFloat(polBalance) - 0.01)
      setSwapAmount(maxPol.toString())
    } else {
      setSwapAmount(ogunBalance)
    }
  }

  // Fetch swap quote with debounce
  useEffect(() => {
    if (!web3 || !swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapQuote(null)
      return
    }

    const fetchQuote = async () => {
      setSwapQuoteLoading(true)
      try {
        const amountIn = web3.utils.toWei(swapAmount, 'ether')
        const path = swapFromToken === 'POL'
          ? [TOKEN_ADDRESSES.WPOL, TOKEN_ADDRESSES.OGUN]
          : [TOKEN_ADDRESSES.OGUN, TOKEN_ADDRESSES.WPOL]

        const amounts = await routerContract(web3).methods.getAmountsOut(amountIn, path).call() as string[]
        const amountOut = web3.utils.fromWei(amounts[1], 'ether')
        setSwapQuote(amountOut)
      } catch (err) {
        console.error('Quote fetch error:', err)
        setSwapQuote(null)
      } finally {
        setSwapQuoteLoading(false)
      }
    }

    // Debounce quote fetching
    const timeoutId = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeoutId)
  }, [web3, swapAmount, swapFromToken])

  // Handle swap
  const handleSwap = async () => {
    if (!web3 || !account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast.error('Enter a valid amount to swap')
      return
    }

    if (!swapQuote) {
      toast.error('Unable to get quote. Try again.')
      return
    }

    // Check chain ID
    const chainId = await web3.eth.getChainId()
    if (Number(chainId) !== 137) {
      toast.error('Please switch to Polygon network')
      return
    }

    // Calculate 0.05% platform fee
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = parseFloat(swapAmount) * platformFeeRate
    const totalNeeded = parseFloat(swapAmount) + platformFee

    // Check balance (including fee)
    const balance = swapFromToken === 'POL' ? polBalance : ogunBalance
    if (totalNeeded > parseFloat(balance)) {
      toast.error(`Insufficient ${swapFromToken} balance. Need ${totalNeeded.toFixed(6)} (${swapAmount} + ${platformFee.toFixed(6)} fee)`)
      return
    }

    setIsLoading(true)
    try {
      const amountIn = web3.utils.toWei(swapAmount, 'ether')
      const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether')
      const minAmountOut = web3.utils.toWei(
        (parseFloat(swapQuote) * (1 - slippage / 100)).toFixed(18),
        'ether'
      )
      const deadline = Math.floor(Date.now() / 1000) + (SWAP_CONFIG.DEADLINE_MINUTES * 60)
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()
      const treasuryAddress = config.treasuryAddress

      // Step 1: Send platform fee to treasury
      setTransactionState('Collecting platform fee...')
      console.log(`📤 Sending ${platformFee.toFixed(6)} ${swapFromToken} fee to treasury: ${treasuryAddress}`)
      if (swapFromToken === 'POL') {
        await web3.eth.sendTransaction({
          from: account,
          to: treasuryAddress,
          value: feeWei,
          gas: '21000',
          gasPrice,
        })
      } else {
        const feeTx = tokenContract(web3).methods.transfer(treasuryAddress, feeWei)
        const feeGas = await feeTx.estimateGas({ from: account })
        await feeTx.send({ from: account, gas: feeGas.toString(), gasPrice })
      }
      console.log('✅ Platform fee sent to treasury')

      // Step 2: Perform swap
      if (swapFromToken === 'POL') {
        // POL -> OGUN: swapExactETHForTokens
        const path = [TOKEN_ADDRESSES.WPOL, TOKEN_ADDRESSES.OGUN]
        setTransactionState('Swapping POL for OGUN...')
        const swapTx = routerContract(web3).methods.swapExactETHForTokens(
          minAmountOut,
          path,
          account,
          deadline
        )
        const gas = await swapTx.estimateGas({ from: account, value: amountIn })
        await swapTx.send({ from: account, gas: gas.toString(), gasPrice, value: amountIn })
      } else {
        // OGUN -> POL: swapExactTokensForETH (requires approval)
        const path = [TOKEN_ADDRESSES.OGUN, TOKEN_ADDRESSES.WPOL]

        // Check allowance
        setTransactionState('Checking allowance...')
        const allowance = await tokenContract(web3).methods.allowance(account, QUICKSWAP_ROUTER).call() as string
        if (BigInt(allowance) < BigInt(amountIn)) {
          setTransactionState('Approving OGUN...')
          const approveTx = tokenContract(web3).methods.approve(QUICKSWAP_ROUTER, amountIn)
          const approveGas = await approveTx.estimateGas({ from: account })
          await approveTx.send({ from: account, gas: approveGas.toString(), gasPrice })
        }

        setTransactionState('Swapping OGUN for POL...')
        const swapTx = routerContract(web3).methods.swapExactTokensForETH(
          amountIn,
          minAmountOut,
          path,
          account,
          deadline
        )
        const gas = await swapTx.estimateGas({ from: account })
        await swapTx.send({ from: account, gas: gas.toString(), gasPrice })
      }

      const outToken = swapFromToken === 'POL' ? 'OGUN' : 'POL'
      toast.success(`Swapped ${swapAmount} ${swapFromToken} for ${parseFloat(swapQuote).toFixed(4)} ${outToken}! (fee: ${platformFee.toFixed(6)} ${swapFromToken})`)
      setSwapAmount('')
      setSwapQuote(null)
      fetchBalances()
    } catch (error: any) {
      console.error('Swap error:', error)
      if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected')
      } else if (error.message?.includes('insufficient')) {
        toast.error('Insufficient balance or liquidity')
      } else {
        toast.error('Swap failed: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setIsLoading(false)
      setTransactionState('')
    }
  }

  // Toggle swap direction
  const toggleSwapDirection = () => {
    setSwapFromToken(prev => prev === 'POL' ? 'OGUN' : 'POL')
    setSwapAmount('')
    setSwapQuote(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl shadow-lg shadow-purple-500/30">
            <Coins className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white drop-shadow-md">OGUN Staking</h2>
            <p className="text-sm text-gray-300">Earn rewards by staking OGUN</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <span className="text-2xl">&times;</span>
          </button>
        )}
      </div>

      {/* ========== STREAMING REWARDS AGGREGATOR ========== */}
      {me?.profile?.id && (
        <div className="relative overflow-hidden rounded-2xl">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-cyan-500/20 animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-cyan-500/10" />

          {/* Glowing border effect */}
          <div className="absolute inset-0 rounded-2xl border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3),inset_0_0_30px_rgba(168,85,247,0.1)]" />

          <div className="relative p-5">
            {/* Header with sparkles */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50 animate-pulse" />
                  <div className="relative p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl">
                    <Headphones className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Streaming Rewards</h3>
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-purple-300">Earn OGUN from every stream</p>
                </div>
              </div>
              <button
                onClick={() => setShowStreamingDetails(!showStreamingDetails)}
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                {showStreamingDetails ? 'Hide' : 'Details'}
                <span className={`transition-transform ${showStreamingDetails ? 'rotate-180' : ''}`}>▼</span>
              </button>
            </div>

            {/* Main Stats - Glowing Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Total OGUN Catalog */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-yellow-500/30 hover:border-yellow-500/60 transition-all min-h-[90px]">
                  <div className="text-[10px] text-yellow-400/80 uppercase tracking-wider mb-1 text-center">Catalog</div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 leading-tight">
                      {streamingLoading ? '...' : streamingStats.totalOgunEarned.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-yellow-500/70 mt-0.5">OGUN</div>
                  </div>
                </div>
              </div>

              {/* Total Streams */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-500/60 transition-all min-h-[90px]">
                  <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider mb-1 text-center">Streams</div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 leading-tight">
                      {streamingLoading ? '...' : formatToCompactNumber(streamingStats.totalStreams)}
                    </div>
                    <div className="text-[10px] text-cyan-500/70 mt-0.5">plays</div>
                  </div>
                </div>
              </div>

              {/* Tracks Earning */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-pink-500/30 hover:border-pink-500/60 transition-all min-h-[90px]">
                  <div className="text-[10px] text-pink-400/80 uppercase tracking-wider mb-1 text-center">Tracks</div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 leading-tight">
                      {streamingLoading ? '...' : streamingStats.tracksWithStreams}
                    </div>
                    <div className="text-[10px] text-pink-500/70 mt-0.5">active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reward Tiers Info */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex flex-col items-center py-2 px-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gray-400">NFT</span>
                </div>
                <span className="text-sm font-bold text-green-400">0.5</span>
                <span className="text-[9px] text-green-500/70">OGUN/stream</span>
              </div>
              <div className="flex flex-col items-center py-2 px-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-[10px] text-gray-400">Non-NFT</span>
                </div>
                <span className="text-sm font-bold text-blue-400">0.05</span>
                <span className="text-[9px] text-blue-500/70">OGUN/stream</span>
              </div>
            </div>

            {/* Expandable Top Tracks Section */}
            {showStreamingDetails && streamingStats.topTracks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-bold text-white">Top Earning Tracks</h4>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {streamingStats.topTracks.map((track: any, index: number) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm text-white font-mono">{track.scid}</p>
                          <p className="text-xs text-gray-500">{track.streamCount} streams</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-400">+{track.ogunRewardsEarned?.toFixed(2)} OGUN</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons - Claim or Stake */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {/* Claim to Wallet */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity" />
                <button
                  disabled={streamingStats.totalUnclaimed <= 0 || claimLoading}
                  className="relative w-full py-3 bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600/50 disabled:to-gray-600/50 text-white disabled:text-gray-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-500/30 disabled:border-gray-500/30 transition-all disabled:cursor-not-allowed"
                  onClick={handleClaimToWallet}
                >
                  {claimLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                  <span className="text-sm">Claim to Wallet</span>
                </button>
              </div>

              {/* Stake Rewards - THE NEW FEATURE */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
                <button
                  disabled={streamingStats.totalUnclaimed <= 0 || claimLoading}
                  className="relative w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600/50 disabled:to-gray-600/50 text-white disabled:text-gray-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-purple-500/50 disabled:border-gray-500/30 transition-all disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  onClick={handleStakeRewards}
                >
                  {claimLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span className="text-sm">Stake Rewards</span>
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                </button>
              </div>
            </div>

            {/* Rewards Summary */}
            {streamingStats.totalUnclaimed > 0 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400">
                  You have <span className="text-yellow-400 font-bold">{streamingStats.totalUnclaimed.toFixed(2)} OGUN</span> unclaimed from streaming
                </p>
              </div>
            )}
            {streamingStats.totalOgunEarned > 0 && streamingStats.totalUnclaimed === 0 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-green-400">
                  All {streamingStats.totalOgunEarned.toFixed(2)} OGUN rewards have been claimed!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chain Selector */}
      <div className="flex items-center gap-2 p-3 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
        <span className="text-sm text-gray-300">Chain:</span>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="bg-gray-900/80 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:border-purple-500/50 focus:outline-none transition-colors"
        >
          <option value="Polygon">Polygon (Live - OGUN Native)</option>
          <option value="ZetaChain">ZetaChain (Omnichain)</option>
          <option value="Ethereum">Ethereum</option>
          <option value="Base">Base</option>
        </select>
        <a
          href={CHAIN_EXPLORERS[selectedChain]}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:text-cyan-300 ml-auto transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/40 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/10 hover:border-purple-500/50 transition-all">
          <div className="flex items-center gap-2 text-purple-300 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Balance</span>
          </div>
          <p className="text-lg font-bold text-white drop-shadow-sm">{formatToCompactNumber(parseFloat(ogunBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/60 to-cyan-800/40 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-2 text-cyan-300 mb-1">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Staked</span>
          </div>
          <p className="text-lg font-bold text-white drop-shadow-sm">{formatToCompactNumber(parseFloat(stakedBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/60 to-green-800/40 backdrop-blur-sm p-4 rounded-xl border border-green-500/30 shadow-lg shadow-green-500/10 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-2 text-green-300 mb-1">
            <Gift className="w-4 h-4" />
            <span className="text-xs font-medium">Rewards</span>
          </div>
          <p className="text-lg font-bold text-white drop-shadow-sm">{formatToCompactNumber(parseFloat(rewardBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/60 to-yellow-800/40 backdrop-blur-sm p-4 rounded-xl border border-yellow-500/30 shadow-lg shadow-yellow-500/10 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center gap-2 text-yellow-300 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">APR</span>
          </div>
          <p className="text-lg font-bold text-white drop-shadow-sm">{apr}%</p>
        </div>
      </div>

      {/* Claim Rewards Button */}
      {parseFloat(rewardBalance) > 0 && (
        <button
          onClick={handleClaimRewards}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <Gift className="w-5 h-5" />
          Claim {formatToCompactNumber(parseFloat(rewardBalance))} OGUN Rewards
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
        <button
          onClick={() => setActiveTab('stake')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stake'
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          Stake
        </button>
        <button
          onClick={() => setActiveTab('unstake')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'unstake'
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Unlock className="w-4 h-4" />
          Unstake
        </button>
        <button
          onClick={() => setActiveTab('swap')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'swap'
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          Swap
        </button>
      </div>

      {/* Transaction State */}
      {transactionState && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400">
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          {transactionState}
        </div>
      )}

      {/* Stake/Unstake Form */}
      {(activeTab === 'stake' || activeTab === 'unstake') && (
        <div className="space-y-4">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">
                {activeTab === 'stake' ? 'Amount to Stake' : 'Amount to Unstake'}
              </span>
              <span className="text-sm text-gray-400">
                Available: {formatToCompactNumber(parseFloat(activeTab === 'stake' ? ogunBalance : stakedBalance))} OGUN
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
              />
              <button
                onClick={handleSetMax}
                className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30"
              >
                MAX
              </button>
              <span className="text-gray-400 font-medium">OGUN</span>
            </div>
          </div>

          <button
            onClick={activeTab === 'stake' ? handleStake : handleUnstake}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {activeTab === 'stake' ? (
              <>
                <Lock className="w-5 h-5" />
                Stake OGUN
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Unstake OGUN
              </>
            )}
          </button>
        </div>
      )}

      {/* Swap Tab */}
      {activeTab === 'swap' && (
        <div className="space-y-4">
          {/* From Token Input */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">From</span>
              <span className="text-sm text-gray-400">
                Balance: {formatToCompactNumber(parseFloat(swapFromToken === 'POL' ? polBalance : ogunBalance))} {swapFromToken}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
              />
              <button
                onClick={handleSwapSetMax}
                className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30"
              >
                MAX
              </button>
              <span className="text-gray-300 font-medium min-w-[60px] text-right">{swapFromToken}</span>
            </div>
          </div>

          {/* Swap Direction Toggle */}
          <div className="flex justify-center">
            <button
              onClick={toggleSwapDirection}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all hover:rotate-180 duration-300"
            >
              <ArrowDownUp className="w-5 h-5 text-purple-400" />
            </button>
          </div>

          {/* To Token Output */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">To (estimated)</span>
              <span className="text-sm text-gray-400">
                Balance: {formatToCompactNumber(parseFloat(swapFromToken === 'POL' ? ogunBalance : polBalance))} {swapFromToken === 'POL' ? 'OGUN' : 'POL'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {swapQuoteLoading ? (
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Fetching quote...</span>
                </div>
              ) : (
                <span className="flex-1 text-2xl font-bold text-white">
                  {swapQuote ? parseFloat(swapQuote).toFixed(6) : '0.00'}
                </span>
              )}
              <span className="text-gray-300 font-medium min-w-[60px] text-right">{swapFromToken === 'POL' ? 'OGUN' : 'POL'}</span>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Slippage Tolerance</span>
              <span className="text-sm text-cyan-400">{slippage}%</span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1, 2].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    slippage === val
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Swap Details */}
          {swapQuote && swapAmount && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 space-y-2 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rate</span>
                <span className="text-white">
                  1 {swapFromToken} = {(parseFloat(swapQuote) / parseFloat(swapAmount)).toFixed(6)} {swapFromToken === 'POL' ? 'OGUN' : 'POL'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Minimum received</span>
                <span className="text-white">
                  {(parseFloat(swapQuote) * (1 - slippage / 100)).toFixed(6)} {swapFromToken === 'POL' ? 'OGUN' : 'POL'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Route</span>
                <span className="text-cyan-400">{swapFromToken} → {swapFromToken === 'POL' ? 'OGUN' : 'POL'}</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={isLoading || !swapAmount || parseFloat(swapAmount) <= 0 || !swapQuote}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <ArrowDownUp className="w-5 h-5" />
            {isLoading ? transactionState || 'Processing...' : `Swap ${swapFromToken} for ${swapFromToken === 'POL' ? 'OGUN' : 'POL'}`}
          </button>

          {/* QuickSwap Fallback Link */}
          <div className="text-center">
            <a
              href={QUICKSWAP_SWAP_URL(TOKEN_ADDRESSES.WPOL, TOKEN_ADDRESSES.OGUN)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Or swap on QuickSwap <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Staking Phases */}
      <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/5">
        <h3 className="text-sm font-bold text-gray-300 mb-3 drop-shadow-sm">REWARD PHASES</h3>
        <div className="space-y-2">
          {phases.map((phase) => (
            <div
              key={phase.phase}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                phase.status === 'active'
                  ? 'bg-gradient-to-r from-green-500/30 to-green-500/10 border border-green-500/40 shadow-lg shadow-green-500/10'
                  : 'bg-black/30 border border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  phase.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  Phase {phase.phase}
                </span>
                <span className="text-sm text-gray-400">{phase.days} days</span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">{phase.reward}</span>
                <span className="text-gray-400 text-sm ml-1">OGUN/day</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Staked */}
      <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 shadow-lg shadow-purple-500/10">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Total Value Locked</span>
          <span className="text-xl font-bold text-white drop-shadow-sm">{totalStaked} OGUN</span>
        </div>
      </div>
    </div>
  )
}

export default StakingPanel
