export interface Metadata {
  name: string
  description: string
  animation_url: string
  asset: string
  image?: string
  art?: string
  album?: string
  artist?: string
  genres?: string[]
  releaseYear?: number
  attributes?: { trait_type: string; value: string }[]
  ISRC?: string
}

export interface NftToken extends Metadata {
  tokenId: number
  pricePerItem: string
  quantity: number
  startingTime: number
  contractAddress: string
}

export interface ReturnValuesTransferSingle {
  operator: string
  from: string
  to: string
  id: string
  value: string
}

export interface ReturnValuesItemListed {
  owner: string
  nft: string
  tokenId: string
  quantity: string
  pricePerItem: string
  startingTime: string
}

export interface ReturnValuesItemSold {
  seller: string
  buyer: string
  nft: string
  tokenId: string
  quantity: string
  pricePerItem: string
}

interface BaseEvent {
  address: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  blockHash: string
  logIndex: number
  removed: boolean
  id: string
  event: string
  signature: string
}

export interface TransferSingle extends BaseEvent {
  returnValues: ReturnValuesTransferSingle
}

export interface ItemListed extends BaseEvent {
  returnValues: ReturnValuesItemListed
}

export interface ItemSold extends BaseEvent {
  returnValues: ReturnValuesItemSold
}

export interface ItemUpdated extends BaseEvent {
  returnValues: ReturnValuesItemSold
}

export interface Events {
  TransferSingle?: TransferSingle
  ItemListed?: ItemListed
  ItemSold?: ItemSold
  ItemUpdated?: ItemUpdated
}
