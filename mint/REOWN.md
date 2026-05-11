# Reown AppKit wire-up (Phase 8)

Phase 2 attempted `@reown/appkit` + `@reown/appkit-adapter-wagmi` but their
adapter's pinned wagmi range doesn't match the installed `@wagmi/core` v2.13
(missing `./tempo` export). Phase 8 finishes the wire-up by version-matrix
testing.

## What Reown gives mint

The connect-wallet modal that picks from 600+ wallets via WalletConnect v2.
Replaces the legacy `@web3modal/ethers5` (Bug #29 documented 403 errors on
the old projectId via api.web3modal.org).

Without Reown, mint still works — wagmi's built-in `injected()` connector
talks to `window.ethereum` (MetaMask, Rabby, Rainbow desktop extension).
Reown adds the QR-scan flow for mobile wallets that don't inject ethereum.

## Setup steps

### 1. Register a project at cloud.reown.com

- Sign in with Frank's email (free, no payment required)
- Create project: name = "SoundChain Mint", url = `https://mint.soundchain.io`
- Copy the `projectId` (32-char hex)

### 2. Set Vercel env var on the mint Vercel project

```bash
cd /Users/soundchain/soundchain/mint
vercel env add NEXT_PUBLIC_REOWN_PROJECT_ID production --value "<projectId>" --yes
```

Per `feedback_vercel_env_add_agent_mode_trap.md`: always use `--value`,
never stdin pipe. Pull always masks sensitive values as `""`.

### 3. Pin compatible Reown + wagmi versions

The Phase 2 attempt failed because Reown 1.6 expects a wagmi/core
internal that 2.13 doesn't export. Resolution paths to test in order:

**Option A: Pin to older wagmi that Reown expects**

```bash
yarn add wagmi@^2.10 @wagmi/core@^2.10 viem@^2.18
yarn add @reown/appkit@^1.6 @reown/appkit-adapter-wagmi@^1.6
yarn build
```

**Option B: Wait for Reown 1.7+ which targets wagmi 2.13+**

Check `https://github.com/reown-com/appkit/releases` — Reown is active,
new minor versions ship monthly. If 1.7+ is out, use latest of both.

**Option C: Use Reown's standalone (non-wagmi) adapter**

```bash
yarn remove @reown/appkit-adapter-wagmi
yarn add @reown/appkit-adapter-ethers
```

Then refactor `mint/src/lib/appkit.ts` to use the ethers adapter and bridge
wallet state to wagmi via a custom hook. More work but decouples version
ranges.

### 4. Restore dynamic init pattern

Once a working version combination is pinned, restore the Phase 2 code
that was in `mint/src/lib/appkit.ts`:

```ts
export async function initAppKit() {
  if (typeof window === 'undefined') return null
  if (appKitInstance) return appKitInstance
  const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
  if (!projectId) return null
  try {
    const [{ createAppKit }, { WagmiAdapter }, { polygon, mainnet, base, arbitrum, optimism }] =
      await Promise.all([
        import('@reown/appkit/react'),
        import('@reown/appkit-adapter-wagmi'),
        import('@reown/appkit/networks'),
      ])
    const wagmiAdapter = new WagmiAdapter({
      networks: [polygon, mainnet, base, arbitrum, optimism],
      projectId,
    })
    appKitInstance = createAppKit({
      adapters: [wagmiAdapter],
      networks: [polygon, mainnet, base, arbitrum, optimism],
      projectId,
      metadata,
      features: { analytics: false, email: false, socials: [] },
      themeMode: 'dark',
      themeVariables: { '--w3m-accent': '#10b981' },
    })
    return appKitInstance
  } catch (err) {
    console.warn('[mint] Reown init failed:', err)
    return null
  }
}
```

### 5. Replace the "Connect wallet" buttons

`mint/src/pages/mint/[scid].tsx` and similar currently use wagmi's
`useConnect` directly. After Reown is wired, swap to:

```tsx
import { useAppKit } from '@reown/appkit/react'
const { open } = useAppKit()
// onClick={() => open()} instead of connect({ connector })
```

### 6. Build + deploy

```bash
yarn build
git add . && git commit -m "feat(mint): Phase 8 — Reown AppKit wired"
git push origin main
```

Vercel auto-deploys mint. Verify:
- Open `https://mint.soundchain.io`
- Click "Connect Wallet"
- Reown modal appears with WalletConnect QR + injected wallet options
- Connect a wallet, balances populate on `/wallet`

## Testing matrix

| Wallet | Method | Expected |
|---|---|---|
| MetaMask desktop extension | Injected | One-tap connect |
| Rainbow Mobile | WalletConnect QR | Scan, approve, return to browser |
| Trust Wallet Mobile | WalletConnect QR | Same |
| Coinbase Wallet | WalletConnect QR or extension | Same |
| Rabby | Injected (extension) | One-tap connect |

## Rollback

If Reown causes issues post-deploy, revert by removing the import:

```bash
yarn remove @reown/appkit @reown/appkit-adapter-wagmi
git revert HEAD
git push
```

Mint reverts to injected-wallet-only mode. Functional, just no QR flow.
