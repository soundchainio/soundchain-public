import Head from 'next/head'
import { ArenaShell } from '@/components/ArenaShell'
import { FinalsCollision } from '@/components/FinalsCollision'

// NBA on arena = the 2026 Finals takeover. New York vs San Antonio, the
// Brunson-vs-Wemby collision. Everything inline — fans never leave.
export default function NbaPage() {
  return (
    <ArenaShell>
      <Head>
        <title>NBA Finals 2026 — New York vs San Antonio | Arena</title>
        <meta name="description" content="The 2026 NBA Finals on Arena: New York vs San Antonio, Brunson vs Wembanyama. Live Game-4 score, series bracket, highlights, and the Fan Zone — all in one place." />
      </Head>
      <FinalsCollision />
    </ArenaShell>
  )
}
