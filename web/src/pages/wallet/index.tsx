import { RefreshButton } from 'components/Buttons/RefreshButton'
import { ConnectedNetwork } from 'components/ConnectedNetwork'
import { CopyWalletAddress } from 'components/CopyWalletAddress'
import { Jazzicon } from 'components/Jazzicon'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { OwnedNfts } from 'components/OwnedNfts'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import useMetaMask from 'hooks/useMetaMask'
import { Activity } from 'icons/Activity'
import { ArrowDown } from 'icons/ArrowDown'
import { ArrowUpRight } from 'icons/ArrowUpRight'
import { CreditCard } from 'icons/CreditCard'
import { Logo } from 'icons/Logo'
import { Matic } from 'icons/Matic'
import { MetaMask } from 'icons/MetaMask'
import { cacheFor } from 'lib/apollo'
import { network } from 'lib/blockchainNetworks'
import { DefaultWallet, useMaticUsdQuery, useUpdateDefaultWalletMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { currency } from 'utils/format'
import SEO from '../../components/SEO'

interface WalletButtonProps {
  href: string
  title: string
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
  handleOnClick?: () => void
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user) return { notFound: true }
    return await cacheFor(WalletPage, {}, context, apolloClient)
  } catch (error) {
    return { notFound: true }
  }
})

const WalletButton = ({ href, title, icon: Icon }: WalletButtonProps) => {
  return (
    <Link href={href}>
      <a className="flex flex-col items-center gap-2 text-xs font-bold text-gray-80">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-50">
          <Icon />
        </div>
        {title}
      </a>
    </Link>
  )
}

export default function WalletPage() {
  const me = useMe()
  const { data } = useMaticUsdQuery()
  const {
    account,
    balance,
    OGUNBalance,
    connect,
    chainId,
    addMumbaiTestnet,
    refetchBalance: refetchMetamaskBalance,
    isRefetchingBalance: isRefetchingMetamaskBalance,
  } = useMetaMask()
  const {
    account: magicAccount,
    balance: magicBalance,
    ogunBalance: magicOgunBalance,
    refetchBalance: refetchMagicBalance,
    isRefetchingBalance: isRefetchingMagicBalance,
  } = useMagicContext()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation()

  const [selectedWallet, setSelectedWallet] = useState(DefaultWallet.Soundchain)
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false)
  const [correctNetwork, setCorrectNetwork] = useState(true)

  const isSoundChainSelected = selectedWallet === DefaultWallet.Soundchain
  const isMetamaskSelected = selectedWallet === DefaultWallet.MetaMask
  const isRefetchingBalance = isRefetchingMagicBalance || isRefetchingMetamaskBalance

  const getAccount = isSoundChainSelected ? magicAccount : account
  const getBalance = isSoundChainSelected ? magicBalance : balance
  const getOgunBalance = isSoundChainSelected ? magicOgunBalance : OGUNBalance
  const getBalanceFormatted = parseFloat(getBalance ?? '0')
  const getOgunBalanceFormatted = parseFloat(getOgunBalance ?? '0')

  const refreshData = async () => {
    if (isSoundChainSelected) {
      console.log('Fetching balance...')
      await refetchMagicBalance()
    } else {
      console.log('Fetching metamask balance...')
      await refetchMetamaskBalance()
    }
  }

  useEffect(() => {
    setTopNavBarProps({
      title: 'Wallet',
      rightButton: (
        <RefreshButton onClick={refreshData} label="Refresh" className="text-center" refreshing={isRefetchingBalance} />
      ),
    })
  }, [setHideBottomNavBar, setTopNavBarProps, isRefetchingBalance])

  useEffect(() => {
    if (!account) {
      setConnectedToMetaMask(false)
      return
    }
    setConnectedToMetaMask(true)
  }, [account])

  useEffect(() => {
    if (chainId !== network.id) {
      setCorrectNetwork(false)
    } else {
      setCorrectNetwork(true)
    }
  }, [chainId])

  const WalletHeader = () => {
    return (
      <div className="flex items-center gap-2 bg-gray-15 py-4 px-3 text-xs font-bold">
        <div className="relative">
          <select
            className="rounded-lg border-0 bg-gray-25 pl-8 text-xs font-bold text-gray-80"
            name="Wallet"
            id="wallet"
            onChange={e =>
              setSelectedWallet(
                DefaultWallet.Soundchain === e.target.value ? DefaultWallet.Soundchain : DefaultWallet.MetaMask,
              )
            }
            value={selectedWallet}
          >
            <option value={DefaultWallet.Soundchain}>SoundChain</option>
            <option value={DefaultWallet.MetaMask}>MetaMask</option>
          </select>
          <span className="pointer-events-none absolute top-2 left-2">
            {isSoundChainSelected ? (
              <Logo id="soundchain-wallet" height="16" width="16" />
            ) : (
              <MetaMask height="16" width="16" />
            )}
          </span>
        </div>
        {(isSoundChainSelected || (isMetamaskSelected && connectedToMetaMask && correctNetwork)) && (
          <label className="ml-auto flex items-center gap-2">
            <span className="text-sm font-bold leading-3 text-white">Default wallet</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-2 border-gray-30 bg-black text-black"
              onChange={() => updateDefaultWallet({ variables: { input: { defaultWallet: selectedWallet } } })}
              checked={me?.defaultWallet === selectedWallet}
            />
          </label>
        )}
      </div>
    )
  }

  interface MetaMaskButtonProps {
    caption: string
    handleOnClick: () => void
  }

  const MetaMaskButton = ({ caption, handleOnClick }: MetaMaskButtonProps) => {
    return (
      <button
        className="flex h-16 items-center justify-center gap-2 rounded-lg border-2 border-gray-50 bg-gray-30 px-4 text-xs font-black uppercase text-white"
        onClick={handleOnClick}
      >
        <MetaMask height="30" width="30" />
        {caption}
      </button>
    )
  }

  return (
    <>
      <SEO title="Wallet - SoundChain" description="SoundChain Wallet" canonicalUrl="/wallet/" />
      <PullToRefresh onRefresh={refreshData} className="h-full">
        <div className="flex h-full flex-col">
          <WalletHeader />
          {isMetamaskSelected && (!connectedToMetaMask || !correctNetwork) ? (
            !connectedToMetaMask ? (
              <div className="flex h-full items-center justify-center">
                <MetaMaskButton caption="Connect Metamask" handleOnClick={connect} />
              </div>
            ) : (
              !correctNetwork && (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                  <p className="text-center text-white">It seems you might not be connected to Mumbai Testnet.</p>
                  <MetaMaskButton caption="Connect to Mumbai Testnet" handleOnClick={addMumbaiTestnet} />
                </div>
              )
            )
          ) : (
            <>
              <div className="flex flex-col items-center justify-center gap-4 p-4">
                {getAccount && <Jazzicon address={getAccount} size={54} />}
                <ConnectedNetwork />
                {getAccount && <CopyWalletAddress walletAddress={getAccount} />}

                <div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row sm:gap-0">
                  <div className="pl-10 pr-10">
                    <div className="relative flex w-full flex-col items-center gap-1">
                      <Matic height="30" width="30" />
                      {getBalance ? (
                        <>
                          <div className="mt-2 text-xs font-bold uppercase text-blue-400">
                            <span className="text-2xl font-bold text-white">{getBalanceFormatted}</span>
                            {` matic`}
                          </div>
                          {data?.maticUsd && (
                            <span className="text-xs font-bold text-gray-50">
                              {`${currency(getBalanceFormatted * parseFloat(data?.maticUsd))} USD`}
                            </span>
                          )}
                        </>
                      ) : (
                        <LoaderAnimation />
                      )}
                    </div>
                    <div className="mt-4 flex justify-center gap-5">
                      <WalletButton title="Activity" icon={Activity} href={`/wallet/${getAccount}/history`} />
                      <WalletButton title="Receive" icon={ArrowDown} href={`/wallet/${getAccount}/receive`} />
                      <WalletButton title="Buy" icon={CreditCard} href="/wallet/buy" />
                      {isSoundChainSelected && (
                        <WalletButton title="Send" icon={ArrowUpRight} href="/wallet/transfer" />
                      )}
                    </div>
                  </div>

                  <div className="pl-10 pr-10">
                    <div className="relative flex w-full flex-col items-center gap-1">
                      <Logo id="ogun-wallet" height="30" width="30" />
                      {getBalance ? (
                        <>
                          <div className="mt-2 text-xs font-bold uppercase text-amber-500">
                            <span className="text-2xl font-bold text-white">{getOgunBalanceFormatted}</span>
                            {` OGUN`}
                          </div>
                        </>
                      ) : (
                        <LoaderAnimation />
                      )}
                    </div>
                    <div className="mt-4 flex justify-center gap-5">
                      <WalletButton title="Activity" icon={Activity} href={`/wallet/${getAccount}/history`} />
                      <WalletButton title="Receive" icon={ArrowDown} href={`/wallet/${getAccount}/receive`} />
                      <WalletButton title="Buy" icon={CreditCard} href="/wallet/buy" />
                      {isSoundChainSelected && (
                        <WalletButton title="Send" icon={ArrowUpRight} href="/wallet/transferOgun" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between p-3">
                <span className="font-bold text-gray-80">Owned NFT’s</span>
                <Link href={`/wallet/${getAccount}/transfer`}>
                  <a className="rounded-lg border border-neutral-500 bg-black px-3 py-2 font-semibold text-neutral-500">
                    Transfer NFT’s
                  </a>
                </Link>
              </div>
              {getAccount && <OwnedNfts refreshing={isRefetchingBalance} owner={getAccount} />}
            </>
          )}
        </div>
      </PullToRefresh>
    </>
  )
}
