/**
 * Pimlico ERC-4337 paymaster scaffold for Arena Picks (SoundChain Path B).
 *
 * STATUS: SCAFFOLD ONLY — body throws "not yet implemented." Direct-EOA
 * `signEscrowJoin` in arena/picks.tsx remains the production path.
 *
 * Why a stub instead of a working integration
 * ───────────────────────────────────────────
 * The viem 2.x + permissionless 0.2.x combo (the Pimlico-recommended SDK as of
 * Apr 2026) ships raw `.ts` source files that require `tsconfig.compilerOptions.
 * target >= "ES2020"` and `downlevelIteration: true`. This project's tsconfig is
 * lower today, so installing those deps fails the build with cascading BigInt
 * literal errors from `node_modules/ox` and `node_modules/viem/...`. Bumping the
 * project-wide TS target is invasive and risky for a feature branch — does NOT
 * belong in the scaffold commit. See "STEPS TO SHIP" below.
 *
 * What the live implementation does (when ready)
 * ──────────────────────────────────────────────
 * Bundles `erc20.approve(escrow, fee)` + `escrow.join(leagueId)` (or just `join`
 * for native POL) into a single sponsored UserOperation routed via Pimlico's
 * bundler + verifying-paymaster on Polygon mainnet (chainId 137). User signs
 * ONE wallet popup. SoundChain (the policy budget on dashboard.pimlico.io) eats
 * the POL gas in exchange for the 0.05% platform fee already collected on settle.
 * Provider research: ~$0.005-0.01 per pick at current Polygon gas; well-covered
 * by the 0.05% wager fee on stakes >= 10 OGUN.
 *
 * Why two paths must coexist
 * ──────────────────────────
 * The sponsored path requires a smart-account deployment (~150k gas first time
 * only) and works only when Pimlico's bundler + paymaster are healthy. The
 * direct-EOA path stays as the unmodified fallback. picks.tsx will dispatch on
 * `isPaymasterEnabled()` AND on whether the connected wallet has POL already;
 * if user has gas, prefer the cheaper direct path.
 *
 * ⚠️ CRITICAL — SMART-ACCOUNT ADDRESS DIVERGENCE
 * ──────────────────────────────────────────────
 * Sponsored UserOps execute from the user's *smart account*, NOT their EOA.
 * `escrow.join` records msg.sender as the joiner — i.e. the smart-account address.
 *
 * Server-side `escrowHasJoined(leagueId, walletAddress)` reads the contract's
 * leagueMembers mapping. If the API receives the EOA but the smart account joined,
 * `hasJoined` returns false and the deposit-verification step in
 * /api/arena/picks/[id].ts (action='deposit' and action='take') fails — flow dies.
 *
 * MUST migrate together (BEFORE flipping `NEXT_PUBLIC_PIMLICO_PAYMASTER_ENABLED=true`):
 *   1. signEscrowJoin in picks.tsx changes return type from bare `string` (txHash)
 *      to `{ txHash, joinerAddress }`. Sponsored path returns smart-account
 *      address; direct path returns EOA.
 *   2. Both call sites (handleCreatePick + handleTake) post `joinerAddress` to
 *      the API instead of the `address` from `resolveWalletProvider`.
 *   3. Settle/payout reads (creatorWalletAddress / takerWalletAddress /
 *      winnerAddress in MongoDB) ALREADY store whatever the API receives — so
 *      after #2, payouts go to the smart-account address. The smart-account
 *      contract receives ERC-20/POL like any address; user withdraws via SDK or
 *      a direct call to `SimpleAccount.execute(...)`.
 *   4. UI: surface the smart-account address in MultiWalletAggregator as a
 *      "Picks Wallet" entry with a "Withdraw to EOA" pill. Otherwise winners
 *      look at their EOA, see zero, file support tickets.
 *
 * STEPS TO SHIP (the live impl, after this scaffold lands)
 * ────────────────────────────────────────────────────────
 *   [ ] tsconfig.json: bump `target` to "ES2020", set `downlevelIteration: true`
 *       — verify zero regressions in existing source files (yarn typecheck +
 *       smoke build)
 *   [ ] yarn add permissionless@^0.2 viem@^2.21
 *   [ ] Replace this file's body with the viem + permissionless impl
 *       (see "Live implementation sketch" below)
 *   [ ] picks.tsx: switch `signEscrowJoin` to dispatch on `isPaymasterEnabled()`,
 *       change return shape, update call sites
 *   [ ] MultiWalletAggregator: render smart-account "Picks Wallet" + Withdraw CTA
 *   [ ] dashboard.pimlico.io: create app, set policy ID with daily UserOps cap
 *   [ ] Vercel env: NEXT_PUBLIC_PIMLICO_API_KEY + NEXT_PUBLIC_PIMLICO_PAYMASTER_ENABLED=true
 *   [ ] Verify Magic-OAuth signer compatibility (toSimpleSmartAccount may reject
 *       non-injected EIP-1193 — test on Pimlico testnet preview before prod)
 *
 * Live implementation sketch (paste back when deps are aligned)
 * ─────────────────────────────────────────────────────────────
 *   import { createPublicClient, http, encodeFunctionData, parseAbi,
 *            type Address, type Hex } from 'viem'
 *   import { polygon } from 'viem/chains'
 *   import { createSmartAccountClient } from 'permissionless'
 *   import { toSimpleSmartAccount } from 'permissionless/accounts'
 *   import { createPimlicoClient } from 'permissionless/clients/pimlico'
 *   import { entryPoint07Address } from 'viem/account-abstraction'
 *
 *   const ENTRY_POINT = entryPoint07Address as Address  // 0x0000000071727De22E5E9d8BAf0edAc6f37da032
 *   const SIMPLE_ACCOUNT_FACTORY: Address =
 *     '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985'  // SimpleAccountFactory v0.7 Polygon
 *   const ABI = parseAbi([
 *     'function approve(address spender, uint256 amount) returns (bool)',
 *     'function join(uint256 leagueId)',
 *     'function join(uint256 leagueId) payable',
 *   ])
 *
 *   const publicClient = createPublicClient({ chain: polygon,
 *                                              transport: http('https://polygon-rpc.com') })
 *   const pimlico      = createPimlicoClient({
 *     transport: http(`https://api.pimlico.io/v2/137/rpc?apikey=${KEY}`),
 *     entryPoint: { address: ENTRY_POINT, version: '0.7' },
 *   })
 *   const smartAccount = await toSimpleSmartAccount({
 *     client: publicClient,
 *     owner: walletProvider as any,            // EIP-1193 from Web3Modal/Magic
 *     factoryAddress: SIMPLE_ACCOUNT_FACTORY,
 *     entryPoint: { address: ENTRY_POINT, version: '0.7' },
 *   })
 *   const client = createSmartAccountClient({
 *     account: smartAccount,
 *     chain: polygon,
 *     bundlerTransport: http(`https://api.pimlico.io/v2/137/rpc?apikey=${KEY}`),
 *     paymaster: pimlico,
 *     userOperation: {
 *       estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
 *     },
 *   })
 *
 *   const calls = isNativeToken(tokenAddress)
 *     ? [{ to: PICKS_ESCROW_ADDRESS, value: entryFeeWei,
 *          data: encodeFunctionData({ abi: ABI, functionName: 'join',
 *                                     args: [BigInt(leagueId)] }) }]
 *     : [
 *         { to: tokenAddress, value: 0n,
 *           data: encodeFunctionData({ abi: ABI, functionName: 'approve',
 *                                      args: [PICKS_ESCROW_ADDRESS, entryFeeWei] }) },
 *         { to: PICKS_ESCROW_ADDRESS, value: 0n,
 *           data: encodeFunctionData({ abi: ABI, functionName: 'join',
 *                                      args: [BigInt(leagueId)] }) },
 *       ]
 *
 *   const userOpHash = await client.sendUserOperation({ calls })
 *   const receipt    = await pimlico.waitForUserOperationReceipt({ hash: userOpHash })
 *   return { txHash: receipt.receipt.transactionHash,
 *            joinerAddress: smartAccount.address }
 *
 * Other risks logged for the audit
 * ────────────────────────────────
 *   • DoS via gas-spike spam: cap UserOps/address/day at the Pimlico policy level
 *   • Pimlico outage = picks halt: keep direct-EOA fallback path alive in picks.tsx
 *   • EntryPoint v0.6 vs v0.7 mismatch is the #1 ERC-4337 footgun — pin both
 *     entryPoint AND factory addresses explicitly (sketch above does this)
 *   • First-tx funding cliff: smart-account deployment is ~150k gas. Policy budget
 *     must cover deployment + approve + join (~300k gas total) for first-time users
 *   • Cross-chain replay: UserOp signature includes chainId — viem handles, but
 *     audit before enabling on any chain other than Polygon
 *
 * See sarg.md (Apr 28 later5/later6) and bug-report.md #82/#81 for the full context.
 */

/**
 * Returns true when the Pimlico paymaster is enabled via env vars.
 * picks.tsx will dispatch on this to choose sponsored vs direct-EOA path.
 */
export function isPaymasterEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_PIMLICO_PAYMASTER_ENABLED === 'true' &&
    !!process.env.NEXT_PUBLIC_PIMLICO_API_KEY
  )
}

/**
 * Sponsored escrow.join — pays gas via Pimlico paymaster, batches ERC-20 approve+join.
 *
 * Returns the bundled UserOp transaction hash AND the smart-account address that
 * actually joined the league. Callers MUST send `joinerAddress` (not the user's
 * EOA) to /api/arena/picks/[id].ts deposit/take handlers — see the address-
 * divergence warning in the file's docblock.
 *
 * NOT YET IMPLEMENTED — body throws. See "STEPS TO SHIP" in the docblock above.
 *
 * @param walletProvider EIP-1193 provider (window.ethereum / Web3Modal / Magic)
 * @param leagueId       on-chain leagueId from POST /api/arena/picks response
 * @param entryFeeWei    decimals-aware fee (parseUnits(amount, decimals))
 * @param tokenAddress   address(0) for native POL, otherwise ERC-20 contract address
 */
export async function signEscrowJoinSponsored(
  _walletProvider: any,
  _leagueId: string,
  _entryFeeWei: string,
  _tokenAddress: string,
): Promise<{ txHash: string; joinerAddress: string }> {
  throw new Error(
    'Pimlico paymaster: scaffold only — see web/src/lib/arena/picks/paymaster.ts ' +
    'docblock for "STEPS TO SHIP". Production flow stays on direct-EOA signEscrowJoin.',
  )
}
