import classNames from 'classnames'
import { Matic } from 'components/Matic'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import useMetaMask from 'hooks/useMetaMask'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import { useCallback, useState } from 'react'
import { compareWallets } from 'utils/Wallet'
import { Ogun } from '../Ogun'

interface WalletSelectorProps {
  className?: string | undefined
  ownerAddressAccount?: string
  showOgun?: boolean
}

export const WalletSelector = ({ className, ownerAddressAccount, showOgun = false }: WalletSelectorProps) => {
  const me = useMe()
  const { account: metamaskAccount, balance: metamaskBalance, OGUNBalance } = useMetaMask()
  const { account: magicAccount, balance: magicBalance, ogunBalance: magicOgunBalance } = useMagicContext()
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation()
  const [selectedWallet, setSelectedWallet] = useState<DefaultWallet>(me?.defaultWallet || DefaultWallet.Soundchain)

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => { // Typed the event
      const { value } = event.target
      setSelectedWallet(value as DefaultWallet)
      updateDefaultWallet({ variables: { input: { defaultWallet: value as DefaultWallet } } })
    },
    [updateDefaultWallet],
  )

  const isSoundChainSelected = selectedWallet === DefaultWallet.Soundchain
  const balance = (isSoundChainSelected ? magicBalance : metamaskBalance) || 0
  const ogunBalance = isSoundChainSelected ? magicOgunBalance : OGUNBalance

  if (compareWallets(magicAccount, ownerAddressAccount) && compareWallets(metamaskAccount, ownerAddressAccount)) {
    return null
  }

  return (
    <div className={classNames('bg-gray-20', className)}>
      <div className="color flex w-full items-center justify-between p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">WALLET</div>
          <div className="flex flex-row items-center gap-1 text-xxs font-black text-gray-80">
            <span>Balance:</span>
            <div>
              <Matic value={balance} />
              {showOgun && <Ogun value={ogunBalance} className="sm:ml-2" />}
            </div>
          </div>
        </div>

        <div className="relative">
          <select
            className="rounded-lg border-0 bg-gray-25 pl-8 text-xs font-bold text-gray-80"
            name="Wallet"
            id="wallet"
            onChange={onChange}
            value={selectedWallet}
          >
            <option value={DefaultWallet.Soundchain}>SoundChain</option>
            {metamaskAccount && <option value={DefaultWallet.MetaMask}>MetaMask</option>}
          </select>
          <span className="pointer-events-none absolute top-2 left-2">
            {isSoundChainSelected ? (
              <Logo id="soundchain-wallet" height="16" width="16" />
            ) : (
              <MetaMask height="16" width="16" />
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
