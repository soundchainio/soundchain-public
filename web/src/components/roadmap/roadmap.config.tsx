import { RoadmapFragments } from './roadmapStep';

export interface RoadmapStep {
  title: string
  status: string
  description: string
}

export const roadmapSteps: RoadmapStep[] = [
  {
    title: 'UI/UX updates',
    status: 'In Progress',
    description: `We’re improving the UI/UX of the whole platform, focusing on high traffic 
    areas of the site as well as improvements to shared components. There’s also a conscious
    focus on improving the desktop experience as well. The changes include improvements to
    the marketplace page, the track listing pages, the users page, the music player, and
    the general layout of the site.`,
  },
  {
    "title": "Multi-edition NFTs",
    "status": "In Progress",
    "description": "Giving you the ability to mint and sell multiple editions of your NFTs. Be able to sell multiple copies of your track."
  },
  {
    "title": "Token Launch",
    "status": "Jun 21, 2022",
    "description": "Token launch, complete with Airdrop, Staking, and Liquidity pool rewards. Also launching with tight platform integration to let you buy and sell with OGUN, with extra trading rewards if you do."
  },
  {
    "title": "Ethereum",
    "status": "July/August",
    "description": "Adding the ability to mint and sell your tracks on the Ethereum blockchain."
  },
  {
    "title": "Ogun Styling",
    "status": "Late Summer",
    "description": "OGUN adds extra spice to the platform. we're creating a variety of ways to enhance your profile. Badges, special profile picture frames,and visual flair will be available to be obtained with OGUN, and we're putting it right back into the economy of the token to recharge rewards or benefit holders."
  },
  {
    "title": "Art NFTs",
    "status": "Fall",
    "description": "Music is closely tied to visual art. SoundChain is excited to support the web3 ecosystem! We’re adding the ability to mint and sell your art as NFTs. This feature really fits into the SoundChain ways. We’ll focus on the ties between a track and its album art. Holders of your art NFTs will be able to automatically select it as their album art when uploading their own tracks, and each NFT minted this way will point right back to you, the artist."
  },
  {
    "title": "Governance",
    "status": "Late Fall",
    "description": "At SoundChain, we want to give you, the fan, the power to help decide the future of our platform. We'll be creating our own form of governance and creating a process that will let you vote on what comes next. We built this platform for you and we want to hear what you have to say. From here on out, you will be able to vote on what to prioritize next"
  },
  {
    "title": "Stems and Samples",
    "status": "",
    "description": "For all you beat-makers and music makers, who really want to pack up everything into each NFT you mint, we'll be adding the capability to include stems and samples right into each NFT you mint. You'll be able to pass on whatever raw materials you choose to pass to the buyer and truly get into that beautiful collaborative mindset as they continue to mix and sample what you've made"
  },
  {
    "title": "Mobile App",
    "status": "",
    "description": "To improve your mobile experience we’re created an app for artists. With our robust capabilities, you, the artist, can truly customize your experience and message without the usual mobile browser limitations."
  },
  {
    "title": "Sell Your Royalties",
    "status": "",
    "description": "We’re offering you more power and control  over your content. With SoundChain you will have the ability to tokenize your royalties for NFT secondary sales. You’ll be able to sell fractions of your royalty rights as their own NFT’s , while generating money from those secondary sales."
  },
  {
    "title": "OGUN Marketing",
    "status": "",
    "description": "Need help sharing your message? We can help with that! The SoundChain platform provides access to premium spots that feature your music for the world to see. Marketing your tracks on SoundChain for OGUN builds an economic community. As a community, earnings from OGUN styling returns back into the token economy and builds even more rewards while boosting the entire economy."
  },
  {
    "title": "MUX Live Streaming",
    "status": "",
    "description": "We’re adding MUX’s live streaming capabilities as a new way to truly connect with your fans and followers. Here, you will find straightforward broadcasting where you can watch, listen, and share with the world."
  },
  {
    "title": "DAW",
    "status": "",
    "description": "We’re here for the music and we believe in the power of music! Our community is built on love by musicians, artists and creatives. We understand our craft and the work necessary to create a good DAW. We intent to build one piece by piece into the SoundChain platform. This will allow you to mint and sell on the spot. We will also carry our message and passion into the school system. Allowing people from of all walks of life, all ages, all genre’s the ability to make music for themselves.  Music made by musicians…Art made by artists. This is SoundChain."
  }
];

export const roadmapColors: Record<number, Partial<Record<RoadmapFragments, string>>> = {
  0: {
    button: 'bg-[#FE5540]',
    panel: `border-[#FE5540]`,
  },
  1: {
    button: 'bg-[#FED503]',
    panel: `border-[#FED503]`,
  },
  2: {
    button: 'bg-[#AC4EFD]',
    panel: `border-[#AC4EFD]`,
  },
  3: {
    button: 'bg-[#26D1A8]',
    panel: `border-[#26D1A8]`,
  },
  4: {
    button: 'bg-[#F1419E]',
    panel: `border-[#F1419E]`,
  },
};

