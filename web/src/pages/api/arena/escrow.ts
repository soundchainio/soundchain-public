/**
 * ARENA ESCROW — Vegas-style wager house
 *
 * arena_agent IS the escrow. Holds OGUN stakes from both players during
 * the match, then instantly pays the winner minus 0.05% fee.
 *
 * Flow:
 *   1. Challenge created with stakes > 0
 *   2. POST /api/arena/escrow { challengeId, action: 'deposit', txHash }
 *      — both players must deposit their stake (OGUN → treasury)
 *   3. When both deposits confirmed → match is FUNDED (can play)
 *   4. POST /api/arena/escrow { challengeId, action: 'payout', winner }
 *      — backend signs OGUN.transfer from treasury → winner
 *      — 0.05% fee stays in treasury
 *      — arena_agent posts payment receipt to feed
 *      — analytics notified
 *
 * Treasury wallet signs via WALLET_PRIVATE_KEY (Vercel env).
 * Same pattern as streaming rewards distributor.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ObjectId } from 'mongodb'
import { ethers } from 'ethers'

const TREASURY = '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b'
const OGUN_ADDRESS = process.env.NEXT_PUBLIC_OGUN_ADRESS || '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'
const RPC_URL = 'https://polygon-bor-rpc.publicnode.com'

const OGUN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const challenges = db.collection('arena_challenges')
  const escrows = db.collection('arena_escrows')
  const posts = db.collection('posts')
  const profiles = db.collection('profiles')

  const { challengeId, action, txHash, winner } = req.body || {}
  if (!challengeId || !action) return res.status(400).json({ error: 'challengeId + action required' })

  const challenge = await challenges.findOne({ _id: new ObjectId(challengeId) })
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' })
  if (!challenge.stakes || challenge.stakes <= 0) {
    return res.status(400).json({ error: 'This challenge has no stakes — escrow not needed' })
  }

  const myProfile = await profiles.findOne({ _id: new ObjectId(auth.profileId) })
  const myHandle = myProfile?.userHandle || 'anon'

  // ─── DEPOSIT — player sends OGUN to treasury as escrow ──
  if (action === 'deposit') {
    if (!txHash) return res.status(400).json({ error: 'txHash required — transfer OGUN to treasury first' })

    // Check if this player already deposited
    const existing = await escrows.findOne({ challengeId, depositor: myHandle })
    if (existing) return res.status(409).json({ error: 'Already deposited for this match' })

    // Record deposit
    await escrows.insertOne({
      challengeId,
      depositor: myHandle,
      amount: challenge.stakes,
      txHash,
      depositedAt: new Date(),
    })

    // Check if BOTH players have deposited
    const allDeposits = await escrows.find({ challengeId }).toArray()
    const isFunded = allDeposits.length >= 2

    if (isFunded) {
      // Mark challenge as funded + live
      await challenges.updateOne({ _id: new ObjectId(challengeId) }, {
        $set: { status: 'live', fundedAt: new Date() },
      })

      // arena_agent announces match is funded and live
      const totalPot = challenge.stakes * 2
      const fee = Math.ceil(totalPot * 0.0005)
      await posts.insertOne({
        message: `💰 MATCH FUNDED!\n\n@${challenge.challengerHandle} vs @${challenge.acceptedBy}\n${challenge.game} · ${totalPot} OGUN in the pot\n\narena_agent is holding escrow. Winner takes ${totalPot - fee} OGUN (0.05% fee: ${fee} OGUN to treasury).\n\nLET'S GO! 🎮🔥`,
        profileId: 'arena_agent',
        type: 'arena_funded',
        arenaId: challengeId,
        createdAt: new Date(),
        reactions: {},
        reactionTally: 0,
        commentCount: 0,
      })

      // Notify analytics
      fetch(`${req.headers.origin || 'https://soundchain.io'}/api/agent/analytics-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'arena_match_funded', meta: { challengeId, pot: totalPot, game: challenge.game } }),
      }).catch(() => {})
    }

    return res.status(200).json({
      ok: true,
      deposited: challenge.stakes,
      txHash,
      funded: isFunded,
      depositsReceived: allDeposits.length + (existing ? 0 : 1),
      depositsNeeded: 2,
    })
  }

  // ─── PAYOUT — declare winner, backend sends OGUN ────────
  if (action === 'payout') {
    if (!winner) return res.status(400).json({ error: 'winner handle required' })

    // Verify both deposits exist
    const allDeposits = await escrows.find({ challengeId }).toArray()
    if (allDeposits.length < 2) {
      return res.status(400).json({ error: `Only ${allDeposits.length}/2 deposits — match not fully funded` })
    }

    // Check challenge isn't already paid out
    if (challenge.status === 'completed' && challenge.payoutTxHash) {
      return res.status(409).json({ error: 'Already paid out', txHash: challenge.payoutTxHash })
    }

    // Resolve winner's wallet address
    const winnerProfile = await profiles.findOne({ userHandle: winner })
    if (!winnerProfile) return res.status(404).json({ error: `Winner @${winner} not found` })

    const winnerWallet = winnerProfile.hdWalletAddress ||
      winnerProfile.magicWalletAddress ||
      winnerProfile.googleWalletAddress ||
      winnerProfile.discordWalletAddress ||
      winnerProfile.twitchWalletAddress ||
      winnerProfile.emailWalletAddress

    if (!winnerWallet) return res.status(400).json({ error: `@${winner} has no wallet address` })

    // Calculate payout
    const totalPot = challenge.stakes * 2
    const fee = Math.ceil(totalPot * 0.0005)
    const payout = totalPot - fee

    // Sign + send OGUN from treasury to winner
    const privateKey = process.env.WALLET_PRIVATE_KEY
    if (!privateKey) {
      // If no private key, record as pending manual payout
      await challenges.updateOne({ _id: new ObjectId(challengeId) }, {
        $set: { status: 'completed', winner, completedAt: new Date(), payoutPending: true, payoutAmount: payout },
      })

      await posts.insertOne({
        message: `🏆 MATCH RESULT!\n\n@${winner} WINS!\n${challenge.game} · @${challenge.challengerHandle} vs @${challenge.acceptedBy}\n\n💰 Payout: ${payout} OGUN (pending treasury release)\nFee: ${fee} OGUN (0.05%) to treasury\n\nGG! 🎮`,
        profileId: 'arena_agent',
        type: 'arena_result',
        arenaId: challengeId,
        createdAt: new Date(),
        reactions: {},
        reactionTally: 0,
        commentCount: 0,
      })

      return res.status(200).json({ ok: true, winner, payout, fee, status: 'pending_manual_release' })
    }

    try {
      // Execute on-chain payout
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
      const wallet = new ethers.Wallet(privateKey, provider)
      const ogun = new ethers.Contract(OGUN_ADDRESS, OGUN_ABI, wallet)

      const payoutWei = ethers.utils.parseEther(payout.toString())
      const tx = await ogun.transfer(winnerWallet, payoutWei)
      const receipt = await tx.wait()
      const payoutTxHash = receipt.transactionHash

      // Update challenge with payout proof
      await challenges.updateOne({ _id: new ObjectId(challengeId) }, {
        $set: {
          status: 'completed',
          winner,
          completedAt: new Date(),
          payoutTxHash,
          payoutAmount: payout,
          feeAmount: fee,
        },
      })

      // arena_agent posts payment receipt
      await posts.insertOne({
        message: `🏆💰 INSTANT PAYOUT!\n\n@${winner} WINS and receives ${payout} OGUN!\n${challenge.game} · @${challenge.challengerHandle} vs @${challenge.acceptedBy}\n\n📜 TX: ${payoutTxHash}\n🔗 Verify: polygonscan.com/tx/${payoutTxHash}\n\nFee: ${fee} OGUN (0.05%) held by treasury\narena_agent escrow complete ✅`,
        profileId: 'arena_agent',
        type: 'arena_payout',
        arenaId: challengeId,
        createdAt: new Date(),
        reactions: {},
        reactionTally: 0,
        commentCount: 0,
      })

      // Notify analytics
      fetch(`${req.headers.origin || 'https://soundchain.io'}/api/agent/analytics-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'arena_payout',
          meta: { challengeId, winner, payout, fee, txHash: payoutTxHash, game: challenge.game },
        }),
      }).catch(() => {})

      return res.status(200).json({
        ok: true,
        winner,
        payout,
        fee,
        payoutTxHash,
        polygonscan: `https://polygonscan.com/tx/${payoutTxHash}`,
      })
    } catch (err: any) {
      console.error('[Arena Escrow] Payout failed:', err.message)
      return res.status(500).json({ error: 'Payout transaction failed: ' + err.message })
    }
  }

  // ─── STATUS — check escrow state for a challenge ────────
  if (action === 'status') {
    const deposits = await escrows.find({ challengeId }).toArray()
    return res.status(200).json({
      challengeId,
      stakes: challenge.stakes,
      totalPot: challenge.stakes * 2,
      fee: Math.ceil(challenge.stakes * 2 * 0.0005),
      deposits: deposits.map(d => ({ depositor: d.depositor, amount: d.amount, txHash: d.txHash, at: d.depositedAt })),
      funded: deposits.length >= 2,
      status: challenge.status,
      winner: challenge.winner,
      payoutTxHash: challenge.payoutTxHash,
    })
  }

  return res.status(400).json({ error: 'Invalid action. Use: deposit, payout, status' })
}
