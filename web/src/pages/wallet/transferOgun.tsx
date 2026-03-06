import { BackButton } from 'components/common/Buttons/BackButton'
import { FormValues, TransferOgunForm } from 'components/forms/transfer/TransferOgunForm'
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
  leftButton: <BackButton />,
  title: 'Send Tokens',
}

export default function TransferPage() {
  const me = useMe()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNovBarProps)
  }, [setTopNavBarProps])

  const { dispatchShowOgunTransferConfirmationModal, dispatchSetRecipientWalletAddress, dispatchSetAmountToTransfer } =
    useModalDispatch()
  if (!me) return null

  const handleSubmit = (values: FormValues) => {
    const { recipient, amount } = values
    const value = Number(amount)
    dispatchSetRecipientWalletAddress(recipient)
    dispatchSetAmountToTransfer(value.toFixed(precision(value)))
    dispatchShowOgunTransferConfirmationModal(true)
  }

  return (
    <>
      <SEO
        title="Wallet Funds Transfer | SoundChain"
        description="Transfer funds on your SoundChain wallet"
        canonicalUrl="/wallet/transfer/"
      />
      <TransferOgunForm handleSubmit={handleSubmit}></TransferOgunForm>
    </>
  )
}
