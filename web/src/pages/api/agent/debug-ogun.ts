/**
 * Debug OGUN Listings Endpoint
 *
 * Queries MongoDB directly for listings with OGUN prices
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

// Simple query without sort to avoid timeout
const OGUN_LISTINGS_QUERY = `
  query OgunListings {
    listingItems(page: { first: 100 }) {
      nodes {
        id
        title
        artist
        listingItem {
          pricePerItem
          pricePerItemToShow
          OGUNPricePerItem
          OGUNPricePerItemToShow
          acceptsOGUN
          acceptsMATIC
        }
      }
      pageInfo {
        totalCount
      }
    }
  }
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: OGUN_LISTINGS_QUERY }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const data = await response.json()

    if (data.errors) {
      return res.status(500).json({
        success: false,
        error: 'GraphQL error',
        details: data.errors
      })
    }

    const listings = data.data?.listingItems?.nodes || []
    const totalCount = data.data?.listingItems?.pageInfo?.totalCount || 0

    // Filter and analyze OGUN listings
    const ogunListings = listings.filter((l: any) => {
      const ogunPrice = l.listingItem?.OGUNPricePerItem
      return ogunPrice && parseFloat(ogunPrice) > 0
    })

    const maticListings = listings.filter((l: any) => {
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
      ogun_listings: ogunListings.map((l: any) => ({
        id: l.id,
        title: l.title,
        artist: l.artist,
        ogun_price: l.listingItem?.OGUNPricePerItemToShow,
        ogun_price_wei: l.listingItem?.OGUNPricePerItem,
        accepts_ogun: l.listingItem?.acceptsOGUN,
      })),
      sample_all_listings: listings.slice(0, 10).map((l: any) => ({
        id: l.id,
        title: l.title,
        artist: l.artist,
        listing_item: l.listingItem
      }))
    })

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message
    })
  }
}
