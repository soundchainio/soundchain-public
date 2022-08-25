import { SaleType } from 'lib/graphql'

export type SaleTypeLabel = {
  key: SaleType
  label: string
}

export const saleTypes: SaleTypeLabel[] = [
  { key: SaleType.Auction, label: 'Auction' },
  { key: SaleType.BuyNow, label: 'Buy now' },
]

export function getSaleTypeLabelByKey(key: SaleType): string | undefined {
  return saleTypes.find(s => s.key === key)?.label
}
