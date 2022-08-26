import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { DefaultWallet } from 'lib/graphql'

export const WalletSelected = ({ wallet }: { wallet?: DefaultWallet }) => {
  const isSoundChainWallet = wallet === DefaultWallet.Soundchain

  if (!wallet) return null

  return (
    <div className="text-white">
      <div className="flex items-center gap-1 text-sm font-bold">
        {isSoundChainWallet ? (
          <Logo id="soundchain-wallet" height="16" width="16" />
        ) : (
          <MetaMask height="16" width="16" />
        )}
        <span>{`${wallet} wallet`}</span>
      </div>
    </div>
  )
}
