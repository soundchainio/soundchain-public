import { Jazzicon } from 'components/Jazzicon'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { Copy2 as Copy } from 'icons/Copy2'
import { Polygon } from 'icons/Polygon'
import { cacheFor } from 'lib/apollo'
import { User } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import QRCode from 'qrcode'
import { ParsedUrlQuery } from 'querystring'
import { useEffect } from 'react'
import { toast } from 'react-toastify'

export interface ReceivePageProps {
  address: string
}

interface ReceivePageParams extends ParsedUrlQuery {
  address: string
}

// eslint-disable-next-line require-await
export const getServerSideProps = protectPage<ReceivePageProps, ReceivePageParams>(async (context, apolloClient) => {
  const address = context.params?.address
  const { magicWalletAddress, metaMaskWalletAddressees } = context.user as User
  const wallets = [magicWalletAddress, ...(metaMaskWalletAddressees as string[])]

  if (!address || !wallets.includes(address)) {
    return { notFound: true }
  }

  return cacheFor(ReceivePage, { address }, context, apolloClient)
})
const topNovBarProps: TopNavBarProps = {
  title: 'Receive',
}

export default function ReceivePage({ address }: ReceivePageProps) {
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNovBarProps)
  }, [setTopNavBarProps])

  useEffect(() => {
    async function createQrCode() {
      const canvas = document.getElementById('addressQrCodeCanvas')
      await QRCode.toCanvas(canvas, address)
    }
    createQrCode()
  })
  return (
    <>
      <SEO
        title="Wallet Receive Funds | SoundChain"
        description="Receive funds on your SoundChain wallet"
        canonicalUrl={`/wallet/${address}/receive/`}
      />
      <div className="flex h-full flex-col items-center gap-5 px-4 py-7">
        <div className="flex w-full flex-1 flex-col items-center gap-5">
          {address && <Jazzicon address={address} size={54} />}
          <div className="flex w-full flex-row items-center justify-between rounded-sm border border-gray-50 bg-gray-1A py-2 pl-2 pr-3 text-xxs">
            <div className="flex w-10/12 flex-row items-center justify-start">
              <Polygon />
              <span className="md-text-sm mx-1 w-full truncate font-bold text-gray-80">{address}</span>
            </div>
            <button
              className="flex flex-row items-center gap-1 rounded border-2 border-gray-30 border-opacity-75 p-1"
              onClick={() => {
                navigator.clipboard.writeText(address + '')
                toast('Copied to clipboard')
              }}
              type="button"
            >
              <Copy />
              <span className="uppercase leading-none text-gray-80">copy</span>
            </button>
          </div>
          <p className="text-center text-xs font-bold text-gray-80">Send Matic on the Polygon chain this address.</p>
        </div>
        <canvas id="addressQrCodeCanvas" />
        <p className="flex-1 text-center text-xs font-bold text-gray-80">
          Scan this address to send tokens to the address above.
        </p>
      </div>
    </>
  )
}
