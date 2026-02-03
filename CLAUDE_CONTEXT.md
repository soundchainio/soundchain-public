# SoundChain Claude Context
> Auto-generated session context. Do not edit manually.
> Regenerate with: ~/Desktop/soundchain-init.sh

Generated: 2026-01-12 07:24:14

## Project Structure

```
/Users/soundchain/soundchain/           # Main monorepo
├── web/                                 # Next.js frontend (PRIMARY)
├── api/                                 # Backend API
├── soundchain-contracts/                # Smart contracts
├── soundchain-agent/                    # AI agent code
└── docs/                                # Internal documentation

/Users/soundchain/soundchain-agent/      # Standalone agent repo
/Users/soundchain/soundchain-docs/       # GitBook documentation
```

## Current Git Status

### monorepo (production)
```
f2541f1d1 feat: Systematic emote flurry support across all input areas
cb04681f2 fix: Match Comment/NewCommentForm styling to Post.tsx patterns
218a2e4e4 feat: Enable public/anonymous reactions for marketing funnel
```

### agent (main)
```
ebce9a8f docs: Add desktop login errors and mobile protection warning
568bbc34 docs: Add critical desktop login bug to handoff
ce19a760 docs: Add Top 100 playlist feature to handoff
```

### docs (master)
```
0ab687c docs: Complete SoundChain GitBook documentation
```

## Handoff Files

- `~/soundchain/soundchain-agent/HANDOFF_2026-01-10.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-09.md`
- `~/soundchain/HANDOFF_2026-01-09.md`
- `~/soundchain-agent/HANDOFF_2026-01-08.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-07_EVENING.md`
- `~/soundchain-agent/HANDOFF_2026-01-07.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-07.md`
- `~/soundchain-agent/HANDOFF_REALTIME.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-06_evening.md`
- `~/soundchain/web/HANDOFF_2026-01-06_EmoteFixes.md`
- `~/soundchain/web/HANDOFF_2026-01-06_WalletConnect.md`
- `~/soundchain/web/HANDOFF.md`
- `~/soundchain-agent/HANDOFF_2026-01-05_SCidWorker.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-05_final.md`
- `~/soundchain/soundchain-agent/HANDOFF_2026-01-05_session2_final.md`

## Quick Reference Commands

### Development
```bash
cd ~/soundchain/web && yarn dev          # Start web dev server
cd ~/soundchain/api && yarn dev          # Start API dev server
cd ~/soundchain/web && yarn build        # Production build
cd ~/soundchain/web && npx tsc --noEmit  # Type check
```

### Git Workflow
```bash
git status && git diff --stat            # Check changes
git add . && git commit -m "message"     # Commit
git push origin production               # Push to production
```

### Deployment
```bash
vercel --yes                             # Deploy preview
vercel --prod --yes                      # Deploy production
```

## Key Directories

| Purpose | Path |
|---------|------|
| Components | `web/src/components/` |
| Pages | `web/src/pages/` |
| API Routes | `api/src/` |
| GraphQL | `web/src/lib/graphql/` |
| Contracts | `soundchain-contracts/contracts/` |
| Hooks | `web/src/hooks/` |

## Common Issues Quick Fixes

| Issue | Solution |
|-------|----------|
| TypeScript strict errors | Check `tsconfig.json`, use proper typing |
| SSR conflicts | Add `'use client'` directive |
| Build fails | Run `npx tsc --noEmit` first to find errors |
| IPFS issues | Check Pinata API keys in `.env` |

