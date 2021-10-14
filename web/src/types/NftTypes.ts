export interface Metadata {
  name: string;
  description: string;
  asset: string;
  art?: string;
  album?: string;
  artist?: string;
  genres?: string[];
  releaseYear?: number;
  attributes?: { trait_type: string; trait_value: string }[];
}

export interface NftToken extends Metadata {
  tokenId: string;
  pricePerItem: number;
  quantity: number;
  startingTime: number;
  contractAddress: string;
}

export interface ReturnValues {
  operator: string;
  from: string;
  to: string;
  id: string;
  value: string;
}

export interface TransferSingle {
  address: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  id: string;
  returnValues: ReturnValues;
  event: string;
  signature: string;
}

export interface Events {
  TransferSingle: TransferSingle;
}

export interface Receipt {
  blockHash: string;
  blockNumber: number;
  contractAddress?: string;
  cumulativeGasUsed: number;
  effectiveGasPrice: string;
  from: string;
  gasUsed: number;
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
  events: Events;
}
