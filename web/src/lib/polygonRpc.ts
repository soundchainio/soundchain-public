/**
 * Get the Polygon RPC URL — uses our /api/rpc/polygon proxy in browser
 * to avoid CORS + CSP issues, falls back to direct RPC server-side.
 *
 * IMPORTANT: This is a function, not a module-level constant.
 * Module-level window.location access causes TDZ crashes in webpack
 * when the module is loaded before window is available.
 */
export function getPolygonRpc(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/rpc/polygon'
  }
  return process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com'
}
