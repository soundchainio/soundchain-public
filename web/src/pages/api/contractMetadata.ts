/* eslint-disable @typescript-eslint/no-explicit-any */
const handler = (req: any, res: any) => {
  const metadata = {
    name: 'SoundChain',
    description: 'SoundChain is a decentralized music platform that allows users to share their music with the world.',
    image: 'https://soundchain.io/soundchain-app-icon.png',
    external_link: 'https://soundchain.io',
  }

  return res.status(200).send(metadata)
}

export default handler
