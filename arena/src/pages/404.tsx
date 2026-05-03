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
          <div className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/80">
            404 · NOT FOUND
          </div>
          <h1 className="text-3xl font-black arena-hologram-text">Off the bracket.</h1>
          <p className="text-sm text-gray-400">
            This page doesn&apos;t exist on Arena. Head back to the hub.
          </p>
          <div className="flex justify-center">
            <PillButton href="/" variant="primary">
              BACK TO HUB →
            </PillButton>
          </div>
        </div>
      </ArenaShell>
    </>
  )
}
