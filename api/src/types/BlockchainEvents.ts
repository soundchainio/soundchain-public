/* eslint-disable @typescript-eslint/no-explicit-any */
export interface EventData {
  returnValues: {
    [key: string]: any;
  };
  raw: {
    data: string;
    topics: string[];
  };
  event: string;
  signature: string;
  logIndex: number;
  transactionIndex: number;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  address: string;
}

export interface ReturnValuesTransfer {
  operator: string;
  from: string;
  to: string;
  tokenId: string;
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

export interface Transfer extends EventData {
  returnValues: ReturnValuesTransfer;
}

export interface ItemListed extends EventData {
  returnValues: ReturnValuesItemListed;
}

export interface ItemSold extends EventData {
  returnValues: ReturnValuesItemSold;
}

export interface ItemListed extends EventData {
  returnValues: ReturnValuesItemListed;
}

export interface ItemSold extends EventData {
  returnValues: ReturnValuesItemSold;
}

export interface ItemUpdated extends EventData {
  returnValues: ReturnValuesItemUpdated;
}

export interface ItemCanceled extends EventData {
  returnValues: ReturnValuesItemCanceled;
}
