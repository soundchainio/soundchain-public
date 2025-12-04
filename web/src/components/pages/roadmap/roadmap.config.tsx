import { RoadmapFragments } from './roadmapStep'

export interface RoadmapStep {
  title: string
  status: string
  description: string
}

export const roadmapSteps: RoadmapStep[] = [
  // PHASE 1 - IMMEDIATE (December 2025)
  {
    title: 'SoundChain Production Push',
    status: 'Completed - Dec 2025',
    description: 'Pushed major updates to production including DEX dashboard, panel system, Twitch/Discord embeds, and landing page improvements. SoundChain is back online after 9 months!',
  },
  {
    title: 'Custom Sticker System + Emoji Mart',
    status: 'Completed - Dec 2025',
    description: 'Integrated SoundChain custom stickers, Twitch emotes (Kappa, PogChamp, LUL, KEKW), and Kick.com stickers into posts and comments. Full Emoji Mart integration for expressive communication.',
  },
  {
    title: 'Create+ and Library Header Tabs',
    status: 'Completed - Dec 2025',
    description: 'Enhanced navigation with Create+ and Library tabs in the main header for improved content creation workflow.',
  },

  // PHASE 2 - CORE FEATURES (This Week)
  {
    title: 'Playlist DEX Modal - OGUN Rewards Driver',
    status: 'In Progress - Dec 2025',
    description: 'Unified playlist modal driving OGUN streaming rewards for creators AND listeners. Revolutionary feature activating the full token economy - earn while you create, earn while you listen!',
  },
  {
    title: '23 Token Rendering from Figma',
    status: 'In Progress - Dec 2025',
    description: 'Implementing proper rendering for all 23 marketplace tokens from Figma design specifications.',
  },
  {
    title: 'Discord-style 59 Pages Modal',
    status: 'Planned - Dec 2025',
    description: 'Community hub integration with Discord-style modal navigation for enhanced social features.',
  },

  // PHASE 3 - BLOCKCHAIN (1-2 Weeks)
  {
    title: '23+ Omnichain Token Integration - EXCLUSIVE',
    status: 'Planned - Jan 2026',
    description: 'Deploying proxy contracts for 23+ blockchain networks exclusively available on SoundChain.io! Including Bitcoin, Ethereum, Solana, Polygon, Base, Arbitrum, ZetaChain, ApeChain, Berachain, Unichain, Zora, and more. True cross-chain NFT aggregation - one platform, all chains. Private use only on SoundChain.',
  },
  {
    title: 'SCid Code Generator',
    status: 'Planned - Jan 2026',
    description: 'Unique identifier system for all SoundChain NFTs - generating SCid codes for permanent on-chain asset tracking.',
  },
  {
    title: 'BitTorrent DEX Integration',
    status: 'Planned - Jan 2026',
    description: 'Decentralized file distribution for music assets via BitTorrent integration on DEX backend.',
  },

  // PHASE 4 - STANDALONE APP (2-4 Weeks)
  {
    title: 'Electron Wrapper (.dmg, .exe, .AppImage)',
    status: 'Planned - Jan 2026',
    description: 'Cross-platform desktop application using Electron for macOS, Windows, and Linux distribution.',
  },
  {
    title: 'Native macOS/iOS Apps',
    status: 'Planned - Feb 2026',
    description: 'Native Apple ecosystem apps for App Store distribution with full platform integration.',
  },
  {
    title: 'Native Android App',
    status: 'Planned - Feb 2026',
    description: 'Native Android application for Google Play distribution.',
  },
  {
    title: 'Native Windows App',
    status: 'Planned - Feb 2026',
    description: 'Native Windows application for Microsoft Store distribution.',
  },

  // LEGACY ITEMS
  {
    title: 'UI/UX updates',
    status: 'Completed',
    description: `We're improving the UI/UX of the whole platform, focusing on high traffic
    areas of the site as well as improvements to shared components. There's also a conscious
    focus on improving the desktop experience as well. The changes include improvements to
    the marketplace page, the track listing pages, the users page, the music player, and
    the general layout of the site`,
  },
  {
    title: 'Multi-edition NFTs',
    status: 'Completed',
    description:
      'Giving you the ability to mint and sell multiple editions of your NFTs. Be able to sell multiple copies of your track',
  },
  {
    title: 'Token Launch',
    status: 'In Progress',
    description:
      'Token launch, complete with Airdrop, Staking, and Liquidity pool rewards. Also launching with tight platform integration to let you buy and sell with OGUN, with extra trading rewards if you do.',
  },
  {
    title: 'Ethereum',
    status: 'Late Winter',
    description: 'Adding the ability to mint and sell your tracks on the Ethereum blockchain',
  },
  {
    title: 'Ogun Styling',
    status: 'Late Summer 2023',
    description:
      "Adding some spice to the platform, we'll be creating a variety of ways to spiff up your profile. Badges, special profile picture frames, and other visual flair will be available to be obtained with OGUN, and we'll be putting it right back into the economy of the token to recharge rewards or benefit holders",
  },
  {
    title: 'Art NFTs',
    status: 'Fall 2023',
    description:
      "Music has always been tied closely to visual art, and we want to support the whole system. We'll be adding the ability to mint and sell your art as NFTs, and to make it really fit into the SoundChain ways, we'll focus on the ties between a track and its album art. Holders of your art NFTs will be able to automatically select it as their album art when uploading their own tracks, and each NFT minted this way will point right back to you, the artist",
  },
  {
    title: 'Governance',
    status: 'Late Fall 2023',
    description:
      "At SoundChain, we want to give you, the fan, the power to help decide the future of our platform. We'll be creating our own form of governance and creating a process that will let you vote on what comes next. We built this platform for you and we want to hear what you have to say. From here on out, you will be able to vote on what to prioritize next",
  },
  {
    title: 'Stems and Samples',
    status: '',
    description:
      "For all you beat-makers and music makers, who really want to pack up everything into each NFT you mint, we'll be adding the capability to include stems and samples right into each NFT you mint. You'll be able to pass on whatever raw materials you choose to pass to the buyer and truly get into that beautiful collaborative mindset as they continue to mix and sample what you've made",
  },
  {
    title: 'Mobile App',
    status: '',
    description:
      "To really improve the mobile experience, there's nothing better than having an app for it. Through this, we can truly customize your experience without relying on whatever limits we have with mobile browsers",
  },
  {
    title: 'Sell Your Royalties',
    status: '',
    description:
      "To give you more power over your own content, we'll start to offer the ability to tokenize your royalties for NFT secondary sales. You'll be able to sell fractions of the royalty rights as their own NFTs that would get you that part of the money generated from secondary sales",
  },
  {
    title: 'OGUN Marketing',
    status: '',
    description:
      "Need some help spreading the good word? We can help with that. You'll be able to start accessing premium spots on the platform where we'll feature your music for all to see. You'll be able to market your tracks right on SoundChain for OGUN, which, like what we earn from OGUN Styling, will go right back into the token economy to provide more rewards or to boost the economy",
  },
  {
    title: 'MUX Live Streaming',
    status: '',
    description:
      "We'll be adding in MUX's live streaming capabilities as a new way to really connect with your fans. It'll be easy to broadcast and to watch/listen, and maybe OGUN will be involved somehow",
  },
  {
    title: 'DAW',
    status: '',
    description:
      "We're here for the music, and else could really represent our beliefs besides giving you a way to make some. Not only are we working with some of the best musicians, but we ourselves love to make music, so we know what goes into a good DAW. We want to build one right into the platform that will let you mint and sell right there. We also intend to take this feature into schools to give kids a way to make music for themselves",
  },
]

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
}
