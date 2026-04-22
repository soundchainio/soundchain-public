import { FormValues, TransferForm } from 'components/forms/transfer/TransferForm'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useModalDispatch } from 'contexts/ModalContext'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { cacheFor } from 'lib/apollo'
import { protectPage } from 'lib/protectPage'
import React, { useEffect } from 'react'
import { precision } from 'utils/getPrecision'

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user) return { notFound: true }
    return await cacheFor(TransferPage, {}, context, apolloClient)
  } catch (error) {
    return { notFound: true }
  }
})

const topNovBarProps: TopNavBarProps = {
  title: 'Send Tokens',
}

export default function TransferPage() {
  const me = useMe()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNovBarProps)
  }, [setTopNavBarProps])

  const { dispatchShowTransferConfirmationModal, dispatchSetRecipientWalletAddress, dispatchSetAmountToTransfer } =
    useModalDispatch()

  if (!me) return null

  const handleSubmit = (values: FormValues) => {
    const { recipient, amount } = values
    const value = Number(amount)
    dispatchSetRecipientWalletAddress(recipient)
    dispatchSetAmountToTransfer(value.toFixed(precision(value)))
    dispatchShowTransferConfirmationModal(true)
  }

  return (
    <>
      <SEO
        title="Wallet Funds Transfer | SoundChain"
        description="Transfer funds on your SoundChain wallet"
        canonicalUrl="/wallet/transfer/"
      />
      <TransferForm handleSubmit={handleSubmit}></TransferForm>
    </>
  )
}
