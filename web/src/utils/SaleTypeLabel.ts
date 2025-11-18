import * as GraphQL from '../lib/graphql';

export type SaleTypeLabel = {
  key: GraphQL.SaleType
  label: string
}

// Safe access to SaleType enum with fallback for SSR
const SaleType = GraphQL.SaleType || {};

export const saleTypes: SaleTypeLabel[] = SaleType.Auction ? [
  { key: SaleType.Auction, label: 'Auction' },
  { key: SaleType.BuyNow, label: 'Buy now' },
] : [];

export function getSaleTypeLabelByKey(key: GraphQL.SaleType): string | undefined {
  return saleTypes.find(s => s.key === key)?.label
}
