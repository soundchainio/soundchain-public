import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { useMe } from 'hooks/useMe';
import { useModalDispatch } from 'contexts/providers/modal';
import { Layout } from 'components/Layout';
import Head from 'next/head';
import { FormValues, TransferForm } from 'components/forms/transfer/transferForm';
import React from 'react';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Send Tokens'
};

export default function TransferPage() {
  const me = useMe();
  const { dispatchShowTransferConfirmationModal, dispatchSetRecipientWalletAddress, dispatchSetAmountToTransfer } = useModalDispatch();
  if (!me) return null;
  
  const handleSubmit = (values: FormValues) => {
    const {recipient, amount} = values
    dispatchSetRecipientWalletAddress(recipient)
    dispatchSetAmountToTransfer(amount)
    dispatchShowTransferConfirmationModal(true)
  }

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <TransferForm handleSubmit={handleSubmit}></TransferForm>
    </Layout>
  )
}