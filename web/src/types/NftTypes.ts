export interface Metadata {
  name: string;
  description: string;
  asset: string;
  art?: string;
  attributes?: { trait_type: string; trait_value: string }[];
}

export interface NftToken extends Metadata {
  tokenId: string;
  pricePerItem: number;
  quantity: number;
  startingTime: number;
}
