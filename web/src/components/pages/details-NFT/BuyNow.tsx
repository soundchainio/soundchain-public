import MaxGasFee from 'components/MaxGasFee'
import { SoundchainFee } from 'components/SoundchainFee'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { TokenSelector } from 'components/dex/TokenSelector'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { useEffect, useState } from 'react'
import Web3 from 'web3'
import { Token, TOKEN_INFO, getDisplaySymbol } from 'constants/tokens'
import { Zap } from 'lucide-react'

interface BuyNowProps {
  price: number
  priceOGUN: number
  isPaymentOGUN: boolean
  ownerAddressAccount: string
  startTime: number
  onTokenChange?: (token: Token) => void
}

export const BuyNow = ({ price, priceOGUN, isPaymentOGUN, ownerAddressAccount, startTime, onTokenChange }: BuyNowProps) => {
  const hasStarted = startTime <= new Date().getTime() / 1000

  const { web3 } = useWalletContext()
  const { getRewardsRate } = useBlockchainV2()
  const [rewardRatePercentage, setRewardsRatePercentage] = useState('')
  const [selectedToken, setSelectedToken] = useState<Token>(isPaymentOGUN ? 'OGUN' : 'MATIC')

  useEffect(() => {
    const fetchRewardRate = async () => {
      const result1e4 = await getRewardsRate(web3 as Web3)
      const calculatedPercentage = (parseInt(result1e4) / 10000) * 100
      setRewardsRatePercentage(calculatedPercentage.toString())
    }
    fetchRewardRate()
  }, [setRewardsRatePercentage, getRewardsRate, web3])

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token)
    onTokenChange?.(token)
  }

  if (!hasStarted) {
    return null
  }

  const isOgunPayment = selectedToken === 'OGUN'
  const displaySymbol = getDisplaySymbol(selectedToken)
  const tokenInfo = TOKEN_INFO[selectedToken]

  return (
    <div className="mb-16">
      <WalletSelector className="bg-gray-10 py-2" ownerAddressAccount={ownerAddressAccount} showOgun={isOgunPayment} />

      {/* L2 Multi-Token Payment Section */}
      <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border-y border-white/5 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Pay with L2 Token</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">24 Tokens</span>
        </div>
        <TokenSelector
          selectedToken={selectedToken}
          onSelectToken={handleTokenChange}
          showBalance={true}
          compact={false}
        />
        {selectedToken === 'OGUN' && (
          <p className="mt-2 text-xs text-purple-400 flex items-center gap-1">
            <span>🔥</span>
            OGUN purchases contribute to token burns + {rewardRatePercentage}% rewards
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 bg-gray-20 px-4 py-6">
        <SoundchainFee
          price={isOgunPayment ? priceOGUN : price}
          isPaymentOGUN={isOgunPayment}
          rewardRatePercentage={rewardRatePercentage}
          showSoundChainFee={false}
        />
        <MaxGasFee />
      </div>
    </div>
  )
}
