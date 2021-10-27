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

interface BaseEvent {
  address: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  id: string;
  event: string;
  signature: string;
}

export interface TransferSingle extends BaseEvent {
  returnValues: ReturnValuesTransferSingle;
}

export interface ItemListed extends BaseEvent {
  returnValues: ReturnValuesItemListed;
}

export interface ItemSold extends BaseEvent {
  returnValues: ReturnValuesItemSold;
}

export interface ReceiptItemListed {
  transactionHash: string;
  transactionIndex: number;
  returnValues: ReturnValuesItemListed;
}

export interface ReceiptSold {
  transactionHash: string;
  transactionIndex: number;
  returnValues: ReturnValuesItemSold;
}
