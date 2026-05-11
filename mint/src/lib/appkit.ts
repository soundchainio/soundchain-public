/**
 * Wallet connect modal — Phase 3 wiring.
 *
 * Reown AppKit was attempted in Phase 2 but its peer-dep chain
 * (@reown/appkit → @wagmi/connectors → @wagmi/core path `./tempo`) is
 * version-mismatched at the time of standup. To keep the shell shippable,
 * we defer the actual connect modal to Phase 3 when we register a fresh
 * cloud.reown.com project and pin a compatible adapter version.
 *
 * Plain wagmi v2 + viem still work for read/write w/ injected wallets
 * (window.ethereum, MetaMask) — see `lib/wagmi.ts`. The modal is just the
 * pretty multi-wallet picker on top.
 *
 * Phase 3 setup:
 *   1. Register at cloud.reown.com → get projectId
 *   2. Set NEXT_PUBLIC_REOWN_PROJECT_ID in Vercel
 *   3. Pin compatible @reown/appkit + @reown/appkit-adapter-wagmi versions
 *      against the installed wagmi v2
 *   4. Restore the dynamic init pattern that lived here in Phase 2
 */

export const metadata = {
  name: 'SoundChain Mint',
  description: 'Mint NFT music editions, trade, stake — the SoundChain forge.',
  url: 'https://mint.soundchain.io',
  icons: ['https://mint.soundchain.io/icon-192.png'],
}

export async function initAppKit(): Promise<null> {
  // No-op for Phase 2 shell. See file header for Phase 3 plan.
  return null
}

export function openConnectModal(): boolean {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.info('[mint] Wallet connect modal lands in Phase 3 (Reown wire-up).')
  }
  return false
}

export function isAppKitReady(): boolean {
  return !!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
}
