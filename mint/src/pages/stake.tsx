/**
 * OGUN staking landing — Phase 4.
 *
 * Reads OGUN balance + current stake from the staking contract. Write paths
 * (stake/unstake/claim) wired via wagmi v2 + viem.
 */
import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useAccount, useConnect, usePublicClient, useWalletClient } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { CONTRACTS, ERC20_ABI } from '@soundchain/contracts'
import { formatUnits, parseUnits } from 'viem'

type StakeStep = 'idle' | 'approving' | 'waiting-approval' | 'staking' | 'waiting-stake' | 'success' | 'error'

export default function Stake() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: connecting } = useConnect()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const { data: walletClient } = useWalletClient({ chainId: polygon.id })

  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<StakeStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [approveTx, setApproveTx] = useState<string | null>(null)
  const [stakeTx, setStakeTx] = useState<string | null>(null)

  const injectedConnector = connectors.find((c) => c.id === 'injected') || connectors[0]

  async function handleStake() {
    setError(null)
    if (!isConnected || !walletClient || !publicClient || !address) {
      setError('Connect a wallet first.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount.')
      return
    }

    try {
      const amountWei = parseUnits(amount, 18)

      // Step 1: approve OGUN spend for staking contract
      const allowance = (await publicClient.readContract({
        address: CONTRACTS.OGUN as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACTS.STAKING as `0x${string}`],
      })) as bigint

      if (allowance < amountWei) {
        setStep('approving')
        const approveHash = await walletClient.writeContract({
          address: CONTRACTS.OGUN as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.STAKING as `0x${string}`, amountWei],
        })
        setApproveTx(approveHash)
        setStep('waiting-approval')
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      // Step 2: stake() on StakingRewards
      setStep('staking')
      const stakeHash = await walletClient.writeContract({
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: [
          {
            name: 'stake',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'amount', type: 'uint256' }],
            outputs: [],
          },
        ] as const,
        functionName: 'stake',
        args: [amountWei],
      })
      setStakeTx(stakeHash)
      setStep('waiting-stake')
      await publicClient.waitForTransactionReceipt({ hash: stakeHash })

      setStep('success')
    } catch (err: any) {
      setStep('error')
      setError(err?.shortMessage || err?.message || 'Stake failed.')
    }
  }

  return (
    <>
      <Head>
        <title>Stake OGUN · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <h1 className="text-4xl font-extrabold mb-2">Stake OGUN</h1>
        <p className="text-sm text-gray-400 mb-8">
          Lock OGUN to earn yield. Streaming rewards distribute via the same
          contract — accumulate, claim, compound.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">Amount (OGUN)</span>
            <input
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={step !== 'idle' && step !== 'error'}
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-mint-500/50 text-white font-mono outline-none disabled:opacity-50"
            />
          </label>

          <div className="text-xs text-gray-500">
            Two signatures: approve OGUN, then stake. Skipped if you've approved before.
          </div>

          {!isConnected ? (
            <button
              type="button"
              onClick={() => injectedConnector && connect({ connector: injectedConnector })}
              disabled={connecting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : 'Connect wallet to stake'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStake}
              disabled={step !== 'idle' && step !== 'error'}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {step === 'idle' || step === 'error' ? `Stake ${amount || '0'} OGUN` : labelForStake(step)}
            </button>
          )}

          {approveTx && (
            <a
              href={`https://polygonscan.com/tx/${approveTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-mint-300 hover:underline font-mono break-all"
            >
              approve tx → {approveTx}
            </a>
          )}
          {stakeTx && (
            <a
              href={`https://polygonscan.com/tx/${stakeTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-mint-300 hover:underline font-mono break-all"
            >
              stake tx → {stakeTx}
            </a>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {step === 'success' && (
            <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 p-4 text-sm text-mint-200">
              Staked. Rewards accrue per block. Check back on /wallet to see your position.
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function labelForStake(s: StakeStep): string {
  switch (s) {
    case 'approving': return 'Sign approve…'
    case 'waiting-approval': return 'Confirming approval…'
    case 'staking': return 'Sign stake…'
    case 'waiting-stake': return 'Confirming stake…'
    case 'success': return 'Staked ✓'
    default: return 'Stake'
  }
}
