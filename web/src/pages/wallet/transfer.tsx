import { BackButton } from 'components/Buttons/BackButton';
import { FormValues, TransferForm } from 'components/forms/transfer/TransferForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
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
      <SEO
        title="Soundchain - Wallet Funds Transfer"
        description="Soundchain Wallet Funds Transfer"
        canonicalUrl="/wallet/transfer/"
      />
      <TransferForm handleSubmit={handleSubmit}></TransferForm>
    </Layout>
  );
}
