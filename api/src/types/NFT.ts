export interface NFT {
  to: string;
  name: string;
  description: string;
  assetKey: string;
  artKey?: string;
  attributes?: { trait_type: string; trait_value: string }[];
}

export interface Metadata extends Omit<NFT, 'to' | 'assetKey' | 'artKey'> {
  asset: string;
  art?: string;
}
