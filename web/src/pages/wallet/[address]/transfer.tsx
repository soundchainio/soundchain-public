import SEO from '../../../components/SEO';
import React from 'react';
import { TransferNftsForm } from '../../../components/TransferNfts';
import { ParsedUrlQuery } from 'querystring';
import { protectPage } from '../../../lib/protectPage';
import { User } from '../../../lib/graphql';
import { cacheFor } from '../../../lib/apollo';
import HistoryPage from './history';

export interface TransferPageProps {
  address: string;
}

interface TransferPageParams extends ParsedUrlQuery {
  address: string;
}

// eslint-disable-next-line require-await
export const getServerSideProps = protectPage<TransferPageProps, TransferPageParams>(async (context, apolloClient) => {
  const address = context.params?.address;
  const { magicWalletAddress, metaMaskWalletAddressees } = context.user as User;

  const wallets = [
    magicWalletAddress,
    ...(metaMaskWalletAddressees as string[]),
  ];

  if (!address || !wallets.includes(address)) {
    return { notFound: true };
  }

  return cacheFor(HistoryPage, { address }, context, apolloClient);
});

export default function Transfer() {
  return (
    <>
      <SEO
        title="Transfer NFTs - SoundChain"
        description="SoundChain Transfer NFTs"
        canonicalUrl="/wallet/transfer"
      />
      <TransferNftsForm />
    </>
  );
}