import { BackButton } from 'components/Buttons/BackButton';
import { FormValues, TransferForm } from 'components/forms/transfer/TransferForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import Head from 'next/head';
import React from 'react';
import { precision } from 'utils/getPrecision';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Send Tokens',
};

export default function TransferPage() {
  const me = useMe();
  const { dispatchShowTransferConfirmationModal, dispatchSetRecipientWalletAddress, dispatchSetAmountToTransfer } =
    useModalDispatch();
  if (!me) return null;

  const handleSubmit = (values: FormValues) => {
    const { recipient, amount } = values;
    const value = Number(amount);
    dispatchSetRecipientWalletAddress(recipient);
    dispatchSetAmountToTransfer(value.toFixed(precision(value)));
    dispatchShowTransferConfirmationModal(true);
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <TransferForm handleSubmit={handleSubmit}></TransferForm>
    </Layout>
  );
}
