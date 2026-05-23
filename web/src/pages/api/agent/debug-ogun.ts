/**
 * Debug OGUN Listings Endpoint — Vercel-direct (Phase 7g.2)
 * Reads via /api/marketplace/listings.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const ME_BASE = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)
    const response = await fetch(`${ME_BASE}/api/marketplace/listings?limit=100`, { signal: controller.signal })
    clearTimeout(timeoutId)
    const data = await response.json()
    if (!response.ok) {
      return res.status(500).json({ success: false, error: 'listings fetch failed', details: data?.error })
    }
    const listings: any[] = data?.nodes || []
    const totalCount = data?.pageInfo?.totalCount || listings.length

    const ogunListings = listings.filter(l => {
      const ogunPrice = l.listingItem?.OGUNPricePerItem
      return ogunPrice && parseFloat(ogunPrice) > 0
    })
    const maticListings = listings.filter(l => {
      const maticPrice = l.listingItem?.pricePerItem
      return maticPrice && parseFloat(maticPrice) > 0
    })

    return res.status(200).json({
      success: true,
      summary: {
        total_listings: totalCount,
        fetched: listings.length,
        with_ogun_price: ogunListings.length,
        with_matic_price: maticListings.length,
      },
      ogun_listings: ogunListings.map(l => ({
        id: l.id,
        title: l.title,
        artist: l.artist,
        ogun_price: l.listingItem?.OGUNPricePerItemToShow,
        ogun_price_wei: l.listingItem?.OGUNPricePerItem,
        accepts_ogun: l.listingItem?.acceptsOGUN ?? !!l.listingItem?.isPaymentOGUN,
      })),
      sample_all_listings: listings.slice(0, 10).map(l => ({
        id: l.id,
        title: l.title,
        artist: l.artist,
        listing_item: l.listingItem,
      })),
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.name === 'AbortError' ? 'Request timed out' : error.message })
  }
}
