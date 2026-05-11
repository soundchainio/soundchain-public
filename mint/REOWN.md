# Reown AppKit wire-up

`@reown/appkit` connects 600+ wallets via WalletConnect v2 + injected detection.

## Setup

1. Register at cloud.reown.com → get projectId
2. Set env var on Vercel mint project:
   ```bash
   vercel env add NEXT_PUBLIC_REOWN_PROJECT_ID production --value "$PID" --yes
   ```
3. Pin compatible versions (Reown's adapter range can lag wagmi/core):
   ```bash
   yarn add wagmi@^2.10 @wagmi/core@^2.10 viem@^2.18
   yarn add @reown/appkit@^1.6 @reown/appkit-adapter-wagmi@^1.6
   ```
4. Restore the dynamic init in `src/lib/appkit.ts` (see code snippet in file header)
5. Replace `useConnect` button onClicks with Reown's `useAppKit().open()`
6. `yarn build` to verify, then push

## Known peer-dep issue

Reown 1.6 expects a `./tempo` export from `@wagmi/core` that's not in v2.13.
Three resolution paths if Option A above fails:

- **Option B:** wait for Reown 1.7+ that targets wagmi 2.13+
- **Option C:** switch to `@reown/appkit-adapter-ethers` instead — decouples version ranges

## Testing

| Wallet | Method | Expected |
|---|---|---|
| MetaMask extension | Injected | One-tap |
| Rainbow / Trust / Coinbase mobile | WC QR | Scan, approve, return |
| Rabby | Injected | One-tap |

## Rollback

```bash
yarn remove @reown/appkit @reown/appkit-adapter-wagmi
git revert HEAD
```

Mint reverts to wagmi `injected()` connector only — still functional, no QR.
