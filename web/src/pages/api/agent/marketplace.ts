/**
 * Agent Marketplace Endpoint
 *
 * GET /api/agent/marketplace - Browse NFT listings for agents
 *
 * Returns marketplace listings in agent-friendly format
 * Agents can use this to discover and purchase music NFTs
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// GraphQL endpoint
const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

// Query marketplace listings
const LISTINGS_QUERY = `
  query AgentMarketplaceListings($page: PageInput, $sort: SortListingItemInput) {
    listingItems(page: $page, sort: $sort) {
      nodes {
        id
        title
        artist
        artworkUrl
        playbackUrl
        description
        genres
        playbackCount
        favoriteCount
        saleType
        price {
          value
          currency
        }
        trackEditionId
        editionSize
        profileId
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `marketplace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET to browse marketplace.',
      meta: { request_id: requestId }
    })
  }

  try {
    const { limit = '20', sort = 'newest', genre, minPrice, maxPrice } = req.query

    // Fetch from GraphQL
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LISTINGS_QUERY,
        variables: {
          page: { first: Math.min(parseInt(limit as string) || 20, 50) },
          sort: sort === 'popular'
            ? { field: 'PLAYBACK_COUNT', direction: 'DESC' }
            : sort === 'price_low'
            ? { field: 'PRICE', direction: 'ASC' }
            : sort === 'price_high'
            ? { field: 'PRICE', direction: 'DESC' }
            : { field: 'CREATED_AT', direction: 'DESC' }
        }
      })
    })

    const data = await response.json()

    if (data.errors) {
      console.error('[Agent Marketplace] GraphQL Error:', data.errors)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch listings',
        details: data.errors[0]?.message,
        meta: { request_id: requestId }
      })
    }

    const listings = data.data?.listingItems?.nodes || []
    const totalCount = data.data?.listingItems?.pageInfo?.totalCount || 0

    // Transform to agent-friendly format
    const agentListings = listings.map((listing: any) => {
      const priceValue = listing.price?.value || '0'
      const priceCurrency = listing.price?.currency || 'MATIC'

      return {
        // Identifiers
        listing_id: listing.id,
        track_edition_id: listing.trackEditionId,

        // Track info
        title: listing.title,
        artist: listing.artist,
        description: listing.description,
        genres: listing.genres || [],

        // Media URLs
        artwork_url: listing.artworkUrl,
        preview_url: listing.playbackUrl,

        // Pricing
        price: {
          amount: priceValue,
          currency: priceCurrency,
          display: `${priceValue} ${priceCurrency}`
        },

        // Stats
        plays: listing.playbackCount || 0,
        favorites: listing.favoriteCount || 0,
        edition_size: listing.editionSize || 1,

        // Purchase info
        sale_type: listing.saleType || 'FIXED',
        can_buy_with_ogun: true,
        can_buy_with_pol: true,

        // Links
        view_url: `https://soundchain.io/dex/track/${listing.id}`,
        buy_endpoint: '/api/agent/buy'
      }
    })

    // Apply filters if provided
    let filteredListings = agentListings

    if (genre) {
      const genreLower = (genre as string).toLowerCase()
      filteredListings = filteredListings.filter((l: any) =>
        l.genres.some((g: string) => g.toLowerCase().includes(genreLower))
      )
    }

    if (minPrice) {
      filteredListings = filteredListings.filter((l: any) =>
        parseFloat(l.price.amount) >= parseFloat(minPrice as string)
      )
    }

    if (maxPrice) {
      filteredListings = filteredListings.filter((l: any) =>
        parseFloat(l.price.amount) <= parseFloat(maxPrice as string)
      )
    }

    return res.status(200).json({
      success: true,
      message: 'SoundChain NFT Marketplace - Music ownership for agents',
      listings: filteredListings,
      pagination: {
        returned: filteredListings.length,
        total: totalCount,
        has_more: data.data?.listingItems?.pageInfo?.hasNextPage || false
      },
      filters_applied: {
        sort,
        genre: genre || null,
        min_price: minPrice || null,
        max_price: maxPrice || null
      },
      how_to_buy: {
        endpoint: 'POST /api/agent/buy',
        required_fields: ['api_key', 'listing_id', 'payment_token'],
        payment_tokens: ['OGUN', 'POL'],
        example: {
          api_key: 'your_agent_api_key',
          listing_id: 'abc123',
          payment_token: 'OGUN'
        }
      },
      earning_ogun: {
        method: 'Stream music to earn OGUN rewards',
        endpoint: 'POST /api/agent/play',
        rate: '0.05 OGUN per stream (30+ seconds)',
        tip: 'Listen via /api/agent/radio/listen and report plays to accumulate OGUN'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Agent Marketplace] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Marketplace query failed',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
