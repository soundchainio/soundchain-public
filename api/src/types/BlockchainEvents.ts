import { EventData } from 'web3/node_modules/web3-eth-contract/types';

export interface ReturnValuesTransferSingle {
  operator: string;
  from: string;
  to: string;
  id: string;
  value: string;
}

export interface ReturnValuesItemListed {
  owner: string;
  nft: string;
  tokenId: string;
  quantity: string;
  pricePerItem: string;
  startingTime: string;
}

export interface ReturnValuesItemSold {
  seller: string;
  buyer: string;
  nft: string;
  tokenId: string;
  quantity: string;
  pricePerItem: string;
}

export interface ReturnValuesItemUpdated {
  owner: string;
  nft: string;
  tokenId: string;
  newPrice: string;
}

export interface ReturnValuesItemCanceled {
  owner: string;
  nft: string;
  tokenId: string;
}

export interface TransferSingle extends EventData {
  returnValues: ReturnValuesTransferSingle;
}

export interface ItemListed extends EventData {
  returnValues: ReturnValuesItemListed;
}

export interface ItemSold extends EventData {
  returnValues: ReturnValuesItemSold;
}

export interface ReceiptItemListed extends EventData {
  returnValues: ReturnValuesItemListed;
}

export interface ReceiptSold extends EventData {
  returnValues: ReturnValuesItemSold;
}

export interface ReceiptItemUpdated extends EventData {
  returnValues: ReturnValuesItemUpdated;
}

export interface ReceiptItemCanceled extends EventData {
  returnValues: ReturnValuesItemCanceled;
}
