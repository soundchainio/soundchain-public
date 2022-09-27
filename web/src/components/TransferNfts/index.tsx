import { Listbox } from '@headlessui/react'
import { Form, Formik } from 'formik'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMetaMask } from 'hooks/useMetaMask'
import { Checkbox } from 'icons/Checkbox'
import { useRouter } from 'next/dist/client/router'
import { createContext, Fragment, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { useModalDispatch } from '../../contexts/providers/modal'
import useBlockchain, { gas } from '../../hooks/useBlockchain'
import { useLayoutContext } from '../../hooks/useLayoutContext'
import { useMe } from '../../hooks/useMe'
import { CheckboxFilled } from '../../icons/CheckboxFilled'
import { HeartFilled } from '../../icons/HeartFilled'
import { Play } from '../../icons/Play'
import { DefaultWallet, SortOrder, SortTrackField, TracksQuery, useTracksQuery } from '../../lib/graphql'
import Asset from '../Asset'
import { Badge } from '../Badge'
import { Button } from '../Buttons/Button'
import { RefreshButton } from '../Buttons/RefreshButton'
import { InfiniteLoader } from '../InfiniteLoader'
import { InputField } from '../InputField'

export interface FormValues {
  recipient: string
  gasPrice?: string
  gasLimit?: number
  totalGasFee?: string
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  recipient: yup.string().required('Please enter a valid wallet address'),
  gasPrice: yup.string().default(''),
  gasLimit: yup.number().default(gas),
  totalGasFee: yup.string().default('0'),
})

export type InitialValues = Partial<FormValues>

interface TransferNftContextData {
  selectedWallet: DefaultWallet
  setSelectedWallet: (wallet: DefaultWallet) => void
  tracks?: TracksQuery['tracks']
  selectedNftTrack?: {
    id: string
    title: string
    artworkUrl: string
    tokenId?: number
    artist: string
    contractAddress: string
  }
  loadMore: () => void
  refetch: () => void
  setSelectedNft: (newSelectedNft: string) => void
  selectedNft: string
  balance?: string
  gasPrice?: string
}

const TransferNftContext = createContext<TransferNftContextData>({} as TransferNftContextData)

function useTransferNftCtx() {
  return useContext(TransferNftContext)
}

function WalletAddressField() {
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-gray-80">Please enter recipient wallet address:</span>
      <InputField
        type="text"
        label="wallet address"
        name="recipient"
        placeholder="0xDbaF8fB344D9E57fff48659A4Eb718c480A1Fd62"
      />
    </div>
  )
}

function NftItemCheckbox({ active }: { active: boolean }) {
  return active ? <CheckboxFilled /> : <Checkbox />
}

function SelectNFTsField() {
  const { tracks, selectedNft, setSelectedNft, loadMore } = useTransferNftCtx()
  const pageInfo = tracks?.pageInfo

  return (
    <div className="flex flex-col">
      <p className="font-semibold">Select the NFT you which to transfer:</p>
      <Listbox value={selectedNft} onChange={setSelectedNft}>
        <Listbox.Options static className="space-y-1 text-white">
          {tracks?.nodes.map((track, index) => (
            <Listbox.Option key={track.id} value={track.id} as={Fragment} disabled={!track.nftData?.tokenId}>
              {({ selected }) => (
                <li
                  className={`flex cursor-pointer items-center rounded-lg px-2  py-2 ${selected ? 'bg-gray-30' : ''}`}
                >
                  <span className={'font-semibold'}>{index + 1}</span>
                  <div className="relative ml-3 flex h-14 w-14 flex-shrink-0 items-center bg-gray-80">
                    <Asset src={track.artworkUrl} sizes="5rem" />
                  </div>
                  <div className="flex flex-col pl-3">
                    <div className="max-w-[170px] sm:max-w-[250px]">
                      <h3 className={'truncate overflow-ellipsis font-semibold'}>{track.title}</h3>
                    </div>

                    <div className="flex gap-3">
                      <div className={'flex items-center'}>
                        <Play fill="#808080" />
                        <span className={'ml-2'}>{track.playbackCountFormatted || 0}</span>
                      </div>

                      <div className={'flex items-center'}>
                        <HeartFilled width={'10'} height={'10'} fill="#808080" />
                        <span className={'ml-2'}>{track.favoriteCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1" />

                  {track.nftData?.tokenId ? <NftItemCheckbox active={selected} /> : <Badge label="Pending" />}
                </li>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>

      {pageInfo && pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
    </div>
  )
}

export function useTransferNftsControls() {
  const [selectedWallet, setSelectedWallet] = useState(DefaultWallet.Soundchain)
  const [selectedNft, setSelectedNft] = useState('')
  const router = useRouter()
  const { address } = router.query
  const me = useMe()
  const { web3: web3Magic, balance: balanceMagic } = useMagicContext()
  const { web3: web3Metamask, balance: balanceMetamask } = useMetaMask()
  const isSoundchain = address === me?.magicWalletAddress
  const web3 = isSoundchain ? web3Magic : web3Metamask
  const balance = isSoundchain ? balanceMagic : balanceMetamask
  const { getCurrentGasPrice } = useBlockchain()
  const [gasPrice, setGasPrice] = useState<string>('')

  useEffect(() => {
    const gasCheck = () => {
      if (web3) {
        getCurrentGasPrice(web3).then(price => setGasPrice(price))
      }
    }
    gasCheck()
  }, [web3, getCurrentGasPrice])

  const pageSize = 10
  const { data, loading, fetchMore, refetch } = useTracksQuery({
    variables: {
      filter: {
        nftData: {
          owner: address as string,
        },
      },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  })

  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps({
      title: 'Transfer NFT',
      rightButton: (
        <RefreshButton onClick={() => refetch()} label="Refresh" className="text-center" refreshing={loading} />
      ),
    })
  }, [setTopNavBarProps, loading, refetch])

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.tracks.pageInfo.endCursor,
        },
      },
    })
  }

  const selectedNftTrack = useMemo(() => {
    if (!selectedNft) return undefined

    const track = data?.tracks?.nodes.find(track => track.id === selectedNft)

    if (track) {
      return {
        id: track.id,
        artworkUrl: track.artworkUrl,
        artist: track.artist,
        tokenId: track.nftData?.tokenId,
        title: track.title,
        contractAddress: track.nftData?.contract,
      } as TransferNftContextData['selectedNftTrack']
    }
  }, [selectedNft, data])

  return {
    selectedWallet,
    setSelectedWallet,
    loading,
    tracks: data?.tracks,
    loadMore,
    refetch,
    setSelectedNft,
    selectedNft,
    selectedNftTrack,
    balance,
    gasPrice,
    web3,
  }
}

function SelectedNftPreview() {
  const { selectedNftTrack } = useTransferNftCtx()
  return (
    <div className={'flex items-center space-x-2'}>
      {selectedNftTrack && (
        <>
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center bg-gray-80">
            <Asset src={selectedNftTrack.artworkUrl} sizes="5rem" />
          </div>
          <div className="flex max-w-[110px] flex-col sm:max-w-[250px]">
            <h3 className={'truncate overflow-ellipsis text-xs font-semibold text-white'}>{selectedNftTrack.title}</h3>
            <span className={'text-xs text-gray-80'}>{selectedNftTrack.artist}</span>
          </div>
        </>
      )}
    </div>
  )
}

export function TransferNftsForm() {
  const Controls = useTransferNftsControls()
  const me = useMe()
  const { gasPrice, selectedNft, selectedNftTrack, refetch, web3 } = Controls
  const { dispatchShowNftTransferConfirmationModal } = useModalDispatch()

  if (!me) return null

  const defaultValues: InitialValues = {
    recipient: '',
    gasPrice: gasPrice,
    gasLimit: gas,
  }

  return (
    <TransferNftContext.Provider
      value={{
        ...Controls,
      }}
    >
      <Formik
        initialValues={defaultValues}
        validationSchema={validationSchema}
        onSubmit={params => {
          if (!web3 || !params.recipient || !web3.utils.isAddress(params.recipient.trim())) {
            toast.warn('Invalid address')
            return
          }

          if (!selectedNft || !selectedNftTrack) {
            toast.warn('Please select the track you want to transfer')
            return
          }

          dispatchShowNftTransferConfirmationModal({
            show: true,
            trackId: selectedNft,
            walletRecipient: params.recipient.trim(),
            tokenId: selectedNftTrack.tokenId,
            artworkUrl: selectedNftTrack.artworkUrl,
            title: selectedNftTrack.title,
            artist: selectedNftTrack.artist,
            contractAddress: selectedNftTrack.contractAddress,
            refetch,
          })
        }}
      >
        <Form className="container mx-auto flex h-full flex-col gap-3 py-6 px-2 text-gray-80">
          <WalletAddressField />
          <SelectNFTsField />

          <div className="fixed bottom-0 left-0 z-20 flex w-full justify-between bg-black p-5">
            <SelectedNftPreview />
            <div className="w-6/12 md:w-3/12">
              <Button className="p-1" type="submit" variant="orange">
                Transfer NFT
              </Button>
            </div>
          </div>
        </Form>
      </Formik>
    </TransferNftContext.Provider>
  )
}
