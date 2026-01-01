/**
 * OGUN Staking Panel - DEX Style
 * Stake OGUN tokens to earn rewards across multiple chains
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from 'components/common/Buttons/Button'
import { config } from 'config'
import { useMagicContext } from 'hooks/useMagicContext'
import { useWalletConnect } from 'hooks/useWalletConnect'
import useMetaMask from 'hooks/useMetaMask'
import useBlockchain from 'hooks/useBlockchain'
import { toast } from 'react-toastify'
import { formatToCompactNumber } from 'utils/format'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import StakingRewards from 'contract/StakingRewards.sol/StakingRewards.json'
import { Coins, TrendingUp, Wallet, ArrowDownUp, Zap, Lock, Unlock, Gift, ExternalLink } from 'lucide-react'

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
  const { web3: magicLinkWeb3, account: magicLinkAccount } = useMagicContext()
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

  // Balances
  const [ogunBalance, setOgunBalance] = useState('0')
  const [stakedBalance, setStakedBalance] = useState('0')
  const [rewardBalance, setRewardBalance] = useState('0')
  const [totalStaked, setTotalStaked] = useState('0')
  const [apr, setApr] = useState('0')

  // Staking phases info
  const phases = [
    { phase: 1, days: 30, reward: '2,000,000', status: 'active' },
    { phase: 2, days: 60, reward: '833,333', status: 'upcoming' },
    { phase: 3, days: 150, reward: '312,500', status: 'upcoming' },
    { phase: 4, days: 120, reward: '250,000', status: 'upcoming' },
  ]

  // Load wallet
  useEffect(() => {
    if (walletconnectAccount && wcWeb3) {
      setAccount(walletconnectAccount)
      setWeb3(wcWeb3)
    } else if (metamaskAccount && metamaskWeb3) {
      setAccount(metamaskAccount)
      setWeb3(metamaskWeb3)
    } else if (magicLinkAccount && magicLinkWeb3) {
      setAccount(magicLinkAccount)
      setWeb3(magicLinkWeb3)
    }
  }, [walletconnectAccount, metamaskAccount, magicLinkAccount, wcWeb3, metamaskWeb3, magicLinkWeb3])

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!web3 || !account) return

    try {
      // OGUN Balance
      const balance = await tokenContract(web3).methods.balanceOf(account).call() as string
      setOgunBalance(web3.utils.fromWei(balance || '0', 'ether'))

      // Staked Balance & Rewards
      try {
        const balanceData = await tokenStakeContract(web3).methods.getBalanceOf(account).call() as [string, string, string]
        if (balanceData) {
          setStakedBalance(web3.utils.fromWei(balanceData[0] || '0', 'ether'))
        }
        const reward = await tokenStakeContract(web3).methods.getReward(account).call() as string
        setRewardBalance(web3.utils.fromWei(reward || '0', 'ether'))
      } catch {
        setStakedBalance('0')
        setRewardBalance('0')
      }

      // Total Staked (mock for now - would come from contract)
      setTotalStaked('45,000,000')
      setApr('125')
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }, [web3, account])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // Stake OGUN
  const handleStake = async () => {
    if (!web3 || !account || !amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount to stake')
      return
    }

    if (parseFloat(amount) > parseFloat(ogunBalance)) {
      toast.error('Insufficient OGUN balance')
      return
    }

    setIsLoading(true)
    try {
      const weiAmount = web3.utils.toWei(amount, 'ether')
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()

      // Check allowance
      const allowance = await tokenContract(web3).methods.allowance(account, tokenStakeContractAddress).call() as string
      if (parseFloat(allowance) < parseFloat(weiAmount)) {
        setTransactionState('Approving OGUN...')
        const approveTx = tokenContract(web3).methods.approve(tokenStakeContractAddress, weiAmount)
        const approveGas = await approveTx.estimateGas({ from: account })
        await approveTx.send({ from: account, gas: approveGas.toString(), gasPrice })
      }

      // Stake
      setTransactionState('Staking OGUN...')
      const stakeTx = tokenStakeContract(web3).methods.stake(weiAmount)
      const stakeGas = await stakeTx.estimateGas({ from: account })
      await stakeTx.send({ from: account, gas: stakeGas.toString(), gasPrice })

      toast.success(`Successfully staked ${amount} OGUN!`)
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

  // Unstake OGUN
  const handleUnstake = async () => {
    if (!web3 || !account || !amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount to unstake')
      return
    }

    if (parseFloat(amount) > parseFloat(stakedBalance)) {
      toast.error('Amount exceeds staked balance')
      return
    }

    setIsLoading(true)
    try {
      const weiAmount = web3.utils.toWei(amount, 'ether')
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()

      setTransactionState('Unstaking OGUN...')
      const unstakeTx = tokenStakeContract(web3).methods.withdrawStake(weiAmount)
      const unstakeGas = await unstakeTx.estimateGas({ from: account })
      await unstakeTx.send({ from: account, gas: unstakeGas.toString(), gasPrice })

      toast.success(`Successfully unstaked ${amount} OGUN!`)
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

  // Claim Rewards
  const handleClaimRewards = async () => {
    if (!web3 || !account || parseFloat(rewardBalance) <= 0) {
      toast.error('No rewards to claim')
      return
    }

    setIsLoading(true)
    try {
      const gasPrice = web3.utils.toWei(await getCurrentGasPrice(web3), 'gwei').toString()

      setTransactionState('Claiming rewards...')
      const claimTx = tokenStakeContract(web3).methods.withdrawRewards()
      const claimGas = await claimTx.estimateGas({ from: account })
      await claimTx.send({ from: account, gas: claimGas.toString(), gasPrice })

      toast.success(`Successfully claimed ${formatToCompactNumber(parseFloat(rewardBalance))} OGUN!`)
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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">OGUN Staking</h2>
            <p className="text-sm text-gray-400">Earn rewards by staking OGUN</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="text-2xl">&times;</span>
          </button>
        )}
      </div>

      {/* Chain Selector */}
      <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
        <span className="text-sm text-gray-400">Chain:</span>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="bg-gray-700 text-white text-sm rounded px-3 py-1 border-none"
        >
          <option value="Polygon">Polygon (Live)</option>
          <option value="ZetaChain">ZetaChain (Coming Soon)</option>
          <option value="Ethereum">Ethereum (Coming Soon)</option>
          <option value="Base">Base (Coming Soon)</option>
        </select>
        <a
          href={CHAIN_EXPLORERS[selectedChain]}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:text-cyan-300 ml-auto"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 p-4 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs">Balance</span>
          </div>
          <p className="text-lg font-bold text-white">{formatToCompactNumber(parseFloat(ogunBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Lock className="w-4 h-4" />
            <span className="text-xs">Staked</span>
          </div>
          <p className="text-lg font-bold text-white">{formatToCompactNumber(parseFloat(stakedBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-4 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <Gift className="w-4 h-4" />
            <span className="text-xs">Rewards</span>
          </div>
          <p className="text-lg font-bold text-white">{formatToCompactNumber(parseFloat(rewardBalance))} OGUN</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 p-4 rounded-xl border border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">APR</span>
          </div>
          <p className="text-lg font-bold text-white">{apr}%</p>
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
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl">
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
          <div className="bg-gray-800/50 rounded-xl p-4">
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
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <ArrowDownUp className="w-12 h-12 mx-auto text-purple-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Swap Coming Soon</h3>
            <p className="text-sm text-gray-400 mb-4">
              Swap tokens directly on SoundChain with ZetaChain omnichain support
            </p>
            <a
              href="https://app.uniswap.org/#/swap?outputCurrency=0x45f1af89486aeec2da0b06340cd9cd3bd741a15c"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
            >
              Swap on Uniswap <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <a
            href="https://legacy.quickswap.exchange/#/swap?inputCurrency=0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270&outputCurrency=0x45f1af89486aeec2da0b06340cd9cd3bd741a15c"
            target="_blank"
            rel="noreferrer"
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-5 h-5" />
            Buy OGUN on QuickSwap
          </a>
        </div>
      )}

      {/* Staking Phases */}
      <div className="bg-gray-800/30 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-400 mb-3">REWARD PHASES</h3>
        <div className="space-y-2">
          {phases.map((phase) => (
            <div
              key={phase.phase}
              className={`flex items-center justify-between p-3 rounded-lg ${
                phase.status === 'active'
                  ? 'bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/30'
                  : 'bg-gray-800/50'
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
      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl p-4 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Value Locked</span>
          <span className="text-xl font-bold text-white">{totalStaked} OGUN</span>
        </div>
      </div>
    </div>
  )
}

export default StakingPanel
