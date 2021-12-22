/* eslint-disable @typescript-eslint/no-explicit-any */
import { SDKBase } from '@magic-sdk/provider';
import { config } from 'config';
import { magic } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { MeQuery } from 'lib/graphql';
import { useCallback } from 'react';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';

const nftAddress = config.contractAddress as string;
const auctionAddress = config.auctionAddress as string;

export const gas = 1200000;

interface PlaceBidParams {
  tokenId: number;
  from: string;
  value: string;
}
class BlockchainFunction<Type> {
  protected params: Type;
  protected me?: MeQuery['me'];
  protected onReceiptFunction?: (receipt: TransactionReceipt) => void;
  protected onErrorFunction?: (cause: Error) => void;
  protected finallyFunction?: () => void;

  constructor(params: Type, me?: MeQuery['me']) {
    this.params = params;
    this.me = me;
  }

  protected beforeSending = async (web3: Web3, method: () => unknown) => {
    if ((web3.currentProvider as SDKBase['rpcProvider']).isMagic && !(await magic.user.isLoggedIn()) && this.me) {
      await magic.auth.loginWithMagicLink({ email: this.me.email });
    }
    return method();
  };

  onReceipt = (handler: (receipt: TransactionReceipt) => void) => {
    this.onReceiptFunction = handler;
    return this;
  };

  onError = (handler: (cause: Error) => void) => {
    this.onErrorFunction = handler;
    return this;
  };

  finally = (handler: () => void) => {
    this.finallyFunction = handler;
    return this;
  };
}

class PlaceBid extends BlockchainFunction<PlaceBidParams> {
  receipt?: TransactionReceipt;
  execute = async (web3: Web3) => {
    const auctionContract = new web3.eth.Contract(
      soundchainAuction.abi as AbiItem[],
      auctionAddress,
    ) as unknown as SoundchainAuction;

    await this.beforeSending(web3, () => {
      auctionContract.methods
        .placeBid(nftAddress, this.params.tokenId)
        .send({ from: this.params.from, gas, value: this.params.value })
        .on('receipt', receipt => {
          this.receipt = receipt;
          this.onReceiptFunction && this.onReceiptFunction(receipt);
        })
        .catch(this.onErrorFunction)
        .finally(this.finallyFunction);
    });
    return this.receipt;
  };
}

const useBlockchainV2 = () => {
  const me = useMe();

  const placeBid = useCallback(
    (tokenId: number, from: string, value: string) => {
      return new PlaceBid({ from, value, tokenId }, me);
    },
    [me],
  );

  return {
    placeBid,
  };
};

export default useBlockchainV2;
