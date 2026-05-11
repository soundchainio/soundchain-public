import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface ListingPreview {
  id: string
  tokenId: string
  title?: string
  artist?: string
  coverArtUrl?: string
  priceLabel?: string
}

export default function Marketplace() {
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('https://soundchain.io/api/marketplace/listings?limit=24')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setListings(data.listings || [])
        }
      } catch {
        // empty grid renders
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <Head>
        <title>Marketplace · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-6xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">Marketplace</h1>
            <p className="text-sm text-gray-400">
              0.05% fee · the lowest-fee music NFT marketplace in Web3.
            </p>
          </div>
          <Link
            href="/mint"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white text-sm font-semibold hover:opacity-90"
          >
            Mint your own
          </Link>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading listings…</div>}

        {!loading && listings.length === 0 && (
          <div className="rounded-2xl border border-mint-500/20 bg-mint-500/5 p-8 text-center">
            <p className="text-sm text-gray-300 mb-3">
              No listings reachable from this app yet.
            </p>
            <p className="text-xs text-gray-500">
              Listings ship from soundchain.io's marketplace API. When the public
              `/api/marketplace/listings` endpoint is exposed, this grid fills in.
              Until then, browse on{' '}
              <a href="https://soundchain.io" className="text-mint-300 hover:underline">
                soundchain.io
              </a>
              .
            </p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-mint-500/50 transition-colors"
              >
                {listing.coverArtUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.coverArtUrl}
                    alt={listing.title || ''}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-3">
                  <div className="text-sm font-semibold text-white truncate">
                    {listing.title || `Token #${listing.tokenId}`}
                  </div>
                  {listing.artist && (
                    <div className="text-xs text-gray-500 truncate">{listing.artist}</div>
                  )}
                  {listing.priceLabel && (
                    <div className="text-xs text-mint-300 mt-1 font-mono">{listing.priceLabel}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
