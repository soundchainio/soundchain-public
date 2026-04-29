import { useEffect, useRef, useState } from 'react'

const OGUN_CONTRACT = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${OGUN_CONTRACT}&vs_currencies=usd`
const CACHE_TTL_MS = 60_000

let cachedPrice: number | null = null
let cachedAt = 0
let inflight: Promise<number | null> | null = null

async function fetchOgunUsdPrice(): Promise<number | null> {
  const now = Date.now()
  if (cachedPrice !== null && now - cachedAt < CACHE_TTL_MS) return cachedPrice
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(COINGECKO_URL)
      if (!res.ok) return cachedPrice
      const data = await res.json()
      const price = data?.[OGUN_CONTRACT]?.usd ?? null
      if (typeof price === 'number' && price > 0) {
        cachedPrice = price
        cachedAt = Date.now()
      }
      return cachedPrice
    } catch {
      return cachedPrice
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useOgunUsdPrice(): number | null {
  const [price, setPrice] = useState<number | null>(cachedPrice)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchOgunUsdPrice().then(p => {
      if (mountedRef.current && p !== null) setPrice(p)
    })
    const interval = setInterval(() => {
      fetchOgunUsdPrice().then(p => {
        if (mountedRef.current && p !== null) setPrice(p)
      })
    }, CACHE_TTL_MS)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  return price
}
