import { config } from 'config'

/**
 * Transform IPFS URI to HTTP gateway URL
 * Handles various IPFS URL formats:
 * - ipfs://Qm... -> https://gateway.pinata.cloud/ipfs/Qm...
 * - ipfs://baf... -> https://gateway.pinata.cloud/ipfs/baf...
 * - Already HTTP URLs are returned as-is
 * - Empty/null values return fallback
 */
export function getIpfsUrl(uri: string | null | undefined, fallback = '/default-pictures/album-artwork.png'): string {
  if (!uri) return fallback

  // Already an HTTP(S) URL - return as-is
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }

  // Handle ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    const gateway = config.ipfsGateway || 'https://soundchain.mypinata.cloud/ipfs/'
    return `${gateway}${cid}`
  }

  // Handle bare CID (Qm... or baf...)
  if (uri.startsWith('Qm') || uri.startsWith('baf')) {
    const gateway = config.ipfsGateway || 'https://soundchain.mypinata.cloud/ipfs/'
    return `${gateway}${uri}`
  }

  // Return as-is if it's some other format (might be relative URL)
  return uri || fallback
}
