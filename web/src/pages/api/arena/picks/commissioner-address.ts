/**
 * GET /api/arena/picks/commissioner-address
 *
 * Returns the public address of the FantasyLeagueEscrow commissioner wallet,
 * derived from HUMAN_WALLET_SEED at HD path m/44'/60'/9'/0/0.
 *
 * SAFE TO BE PUBLIC: this is a deposit address, not a private key.
 * Frank funds this address with POL on Polygon mainnet to enable on-chain pick creation.
 *
 * Without funding, POST /api/arena/picks fails with "Could not create on-chain escrow league: insufficient funds".
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import { getCommissionerAddress } from 'lib/arena/picks/escrowServer'
import { POLYGON_RPC_URLS } from 'lib/arena/picks/contract'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (!process.env.HUMAN_WALLET_SEED) {
    return res.status(500).json({ error: 'HUMAN_WALLET_SEED not configured in this environment' })
  }

  let address: string
  try {
    address = getCommissionerAddress()
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'derivation failed' })
  }

  // Best-effort: report current POL balance so Frank knows if funding's already there.
  let balanceWei: string | null = null
  let balancePol: string | null = null
  try {
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URLS[0])
    const bal = await provider.getBalance(address)
    balanceWei = bal.toString()
    balancePol = ethers.utils.formatEther(bal)
  } catch {
    // RPC unreachable — return address without balance, that's fine
  }

  return res.status(200).json({
    address,
    derivationPath: "m/44'/60'/9'/0/0",
    chain: 'polygon',
    chainId: 137,
    polygonscan: `https://polygonscan.com/address/${address}`,
    balanceWei,
    balancePol,
    fundingHint: balancePol === null
      ? 'Send ~5 POL to the address above on Polygon mainnet for picks gas. RPC was unreachable so balance is unknown.'
      : Number(balancePol) < 0.5
        ? `Currently has ${balancePol} POL — send at least 5 POL on Polygon mainnet to enable pick creation.`
        : `Currently has ${balancePol} POL — funded and ready.`,
  })
}
