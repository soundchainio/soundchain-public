import { Sad } from 'icons/emoji/Sad'
import Head from 'next/head'

export default function Page404() {
  return (
    <>
      <Head>
        <title>Not Found | SoundChain</title>
        <meta name="description" content="This page does not exist." />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Sad className="w-12" />
        <h1 className="text-xl font-bold text-white">404 Error</h1>
        <h3 className="text-lg font-bold text-gray-500">This page does not exist. </h3>
      </div>
    </>
  )
}
