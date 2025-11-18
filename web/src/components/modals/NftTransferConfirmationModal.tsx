import { Modal } from 'components/Modal'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import useMetaMask from 'hooks/useMetaMask'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { ShowTransferNftConfirmationPayload } from '../../contexts/payloads/modal'
import { useMaxGasFee } from '../../hooks/useMaxGasFee'
import { DefaultWallet } from '../../lib/graphql'
import Asset from '../Asset/Asset'
import { Button } from '../common/Buttons/Button'
import { ConnectedNetwork } from '../ConnectedNetwork'
import { CopyWalletAddress } from '../CopyWalletAddress'
import { Label } from '../Label'
import { Matic } from '../Matic'
import MaxGasFee from '../MaxGasFee'
import { WalletSelected } from '../WalletSelected'

export const NftTransferConfirmationModal = () => {
  const modalState = useModalState()
  const { asPath, query, push } = useRouter()
  const { address: account } = query
  const { dispatchShowNftTransferConfirmationModal } = useModalDispatch()
  const me = useMe()
  const { web3: web3Magic, balance: balanceMagic, refetchBalance: refetchBalanceMagic } = useMagicContext()
  const { web3: web3Metamask, balance: balanceMetamask, refetchBalance: refetchBalanceMetamask } = useMetaMask()
  const { transferNftToken } = useBlockchainV2()
  const [loading, setLoading] = useState<boolean>(false)
  const isSoundchain = account === me?.magicWalletAddress
  const web3 = isSoundchain ? web3Magic : web3Metamask
  const balance = isSoundchain ? balanceMagic : balanceMetamask
  const refetchBalance = isSoundchain ? refetchBalanceMagic : refetchBalanceMetamask

  useEffect(() => {
    handleClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asPath])

  const isOpen = modalState.showTransferNftConfirmation
  const {
    walletRecipient,
    artist = '',
    title = '',
    tokenId,
    artworkUrl,
    contractAddress,
  } = modalState as unknown as ShowTransferNftConfirmationPayload

  const maxGasFee = useMaxGasFee(isOpen)

  const handleClose = () => {
    dispatchShowNftTransferConfirmationModal({
      show: false,
    })
  }

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee
    }
    return false
  }

  const onTransfer = () => {
    if (!web3 || !tokenId || !walletRecipient || !account) {
      console.error({ web3, tokenId, walletRecipient, account })
      toast.error('Unexpected error!')
      return
    }

    if (hasEnoughFunds() && refetchBalance) {
      setLoading(true)
      const onReceipt = () => {
        toast.success('Your track has been transferred successfully!')
        setLoading(false)
        refetchBalance()
        push('/wallet')
      }
      transferNftToken(tokenId, account as string, walletRecipient, { nft: contractAddress })
        .onReceipt(onReceipt)
        .onError(cause => toast.error(cause.message))
        .finally(() => setLoading(false))
        .execute(web3)
    } else {
      toast.warn("Uh-oh, it seems you don't have enough funds to pay for the gas fee of this operation")
      push('/wallet')
    }
  }

  return (
    <Modal
      show={isOpen}
      title={
        <div className="flex justify-center">
          <span>Confirm Transfer</span>
        </div>
      }
      onClose={handleClose}
      leftButton={
        <button className="w-full flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div className="px-4 text-center text-sm font-bold text-gray-80">
        <p className="py-3 text-center">Are you sure you want to send</p>
        <div className="mt-3 flex justify-center">
          <div className="relative ml-3 flex h-14 w-14 flex-shrink-0 items-center bg-gray-80">
            <Asset src={artworkUrl} sizes="5rem" />
          </div>
          <div className={'ml-2 flex flex-col items-start'}>
            <p className={'font-semibold text-white'}>{title}</p>
            <p className={'text-gray-80'}>{artist}</p>
          </div>
        </div>
        <p className="pt-6">This transaction cannot be undone.</p>
      </div>

      <div className="flex flex-col space-y-6 py-6">
        <div className="space-y-2">
          <div className="px-4">
            <Label className="font-bold uppercase" textSize="xs">
              FROM:
            </Label>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <WalletSelected wallet={isSoundchain ? DefaultWallet.Soundchain : DefaultWallet.MetaMask} />
            <ConnectedNetwork />
          </div>
          {account && <CopyWalletAddress walletAddress={account as string} />}
        </div>
        <div className="space-y-2">
          <div className="px-4">
            <Label className="font-bold uppercase" textSize="xs">
              TO:
            </Label>
          </div>
          {walletRecipient && <CopyWalletAddress walletAddress={walletRecipient} />}
        </div>
      </div>

      <div className="flex-1" />
      <div className="flex flex-col pt-4">
        <div className="flex flex-col bg-gray-20">
          <div className="flex flex-col p-4">
            <MaxGasFee text={'Gas fee'} />
          </div>
        </div>
        <div className="flex w-full items-center justify-between bg-black p-5">
          <div className="text-xs">
            <Matic value={Number(maxGasFee || '0')} variant="currency" />
          </div>

          <div className="w-7/12 md:w-3/12">
            <Button className="" onClick={onTransfer} type="submit" variant="approve">
              Confirm Transfer
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center bg-gray-20 bg-opacity-80">
          <Image height={200} width={200} src={'/nyan-cat-rainbow.gif'} alt="Loading" priority />
          <div className="mt-4 text-center text-lg font-bold text-white">Transfering nft...</div>
        </div>
      )}
    </Modal>
  )
}

export default NftTransferConfirmationModal
