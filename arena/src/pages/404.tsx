import Head from 'next/head'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Not Found · SoundChain Arena</title>
        <meta name="robots" content="noindex" />
      </Head>
      <ArenaShell>
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
          <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange">
            404 · NOT FOUND
          </div>
          <h1 className="text-3xl font-black arena-hologram-text">Off the bracket.</h1>
          <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
            This page doesn&apos;t exist on Arena. Head back to the hub or check what&apos;s live now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PillButton href="/" variant="primary">BACK TO HUB →</PillButton>
            <PillButton href="/live" variant="secondary">WHAT&apos;S LIVE</PillButton>
          </div>
        </div>
      </ArenaShell>
    </>
  )
}
