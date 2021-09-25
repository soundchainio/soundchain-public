export interface NFT {
  to: string;
  name: string;
  description: string;
  assetUrl: string;
  artUrl?: string;
  attributes?: { trait_type: string; trait_value: string }[];
}

export interface Metadata extends Omit<NFT, 'to' | 'assetUrl' | 'artUrl'> {
  asset: string;
  art?: string;
}
