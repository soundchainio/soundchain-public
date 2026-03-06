import axios from 'axios';

/**
 * Discord NFT Announcement Service
 * Sends rich embed notifications to Discord when NFTs are minted
 */

// Discord webhook URL for general-chat NFT announcements
const DISCORD_NFT_WEBHOOK_URL = process.env.DISCORD_NFT_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1466934816938397797/JXki-oabEedhgHE7i_oMFrAklD903gnGBsSgJL4oRKe3R1FlgstrmXOf3l3OYMM3D4aX';

// Embed colors (Discord decimal format)
const EMBED_COLORS = [
  65535,    // Cyan
  16738740, // Coral/Salmon
  3066993,  // Green
  10181046, // Purple
  15844367, // Gold
  5793266,  // Teal
  15158332, // Red
  3447003,  // Blue
];

function getRandomColor(): number {
  return EMBED_COLORS[Math.floor(Math.random() * EMBED_COLORS.length)];
}

export interface NFTBlastData {
  trackTitle: string;
  artistName: string;
  description?: string;
  artworkUrl?: string;
  trackId: string;
  editionSize?: number;
  network?: string;
}

/**
 * Send NFT minting announcement to Discord
 */
export async function sendNFTMintedNotification(data: NFTBlastData): Promise<boolean> {
  try {
    const {
      trackTitle,
      artistName,
      description,
      artworkUrl,
      trackId,
      editionSize,
      network = 'Polygon',
    } = data;

    // Format title as "TRACK_TITLE (ARTIST_NAME)"
    const embedTitle = `${trackTitle.toUpperCase()} (${artistName.toUpperCase()})`;

    // Build description with fallback
    const embedDescription = description
      ? `${description} now streaming on decentralized IPFS!`
      : `Fresh music now streaming on decentralized IPFS!`;

    // Build the Discord embed payload
    const payload = {
      embeds: [{
        author: {
          name: 'soundchain.io',
          url: 'https://soundchain.io',
        },
        title: embedTitle,
        description: embedDescription,
        color: getRandomColor(),
        image: artworkUrl ? { url: artworkUrl } : undefined,
        fields: [
          {
            name: 'Artist',
            value: artistName,
            inline: true,
          },
          {
            name: 'Protocol',
            value: 'IPFS/Pinata P2P',
            inline: true,
          },
          {
            name: 'Network',
            value: network,
            inline: true,
          },
          ...(editionSize ? [{
            name: 'Edition Size',
            value: `${editionSize} NFTs`,
            inline: true,
          }] : []),
          {
            name: 'Stream Now',
            value: `[Play on SoundChain](https://soundchain.io/dex/track/${trackId})`,
            inline: false,
          },
        ],
        footer: {
          text: 'SoundChain | Decentralized Music NFTs',
        },
        timestamp: new Date().toISOString(),
      }],
    };

    // Send to Discord webhook
    const response = await axios.post(DISCORD_NFT_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status < 200 || response.status >= 300) {
      console.error(`[Discord] Failed to send NFT notification: ${response.status}`);
      return false;
    }

    console.log(`[Discord] NFT mint notification sent for "${trackTitle}" by ${artistName}`);
    return true;
  } catch (error) {
    console.error('[Discord] Error sending NFT notification:', error);
    return false;
  }
}

/**
 * Send batch NFT minting announcement (for edition drops)
 */
export async function sendEditionMintedNotification(
  data: NFTBlastData & { editionId?: number; minterAddress?: string }
): Promise<boolean> {
  try {
    const {
      trackTitle,
      artistName,
      description,
      artworkUrl,
      trackId,
      editionSize,
      editionId,
      minterAddress,
      network = 'Polygon',
    } = data;

    // Format title
    const embedTitle = `${trackTitle.toUpperCase()} (${artistName.toUpperCase()})`;

    // Build description
    const embedDescription = description
      ? `${description} now streaming on decentralized IPFS!`
      : `New edition drop now streaming on decentralized IPFS!`;

    // Truncate minter address for display
    const minterDisplay = minterAddress
      ? `${minterAddress.slice(0, 6)}...${minterAddress.slice(-4)}`
      : artistName;

    const payload = {
      embeds: [{
        author: {
          name: 'soundchain.io',
          url: 'https://soundchain.io',
        },
        title: embedTitle,
        description: embedDescription,
        color: getRandomColor(),
        image: artworkUrl ? { url: artworkUrl } : undefined,
        fields: [
          {
            name: 'Artist',
            value: minterDisplay,
            inline: true,
          },
          {
            name: 'Protocol',
            value: 'IPFS/Pinata P2P',
            inline: true,
          },
          {
            name: 'Network',
            value: network,
            inline: true,
          },
          ...(editionSize ? [{
            name: 'Edition',
            value: `${editionSize} NFTs`,
            inline: true,
          }] : []),
          {
            name: 'Stream Now',
            value: `[Play on SoundChain](https://soundchain.io/dex/track/${trackId})`,
            inline: false,
          },
        ],
        footer: {
          text: 'SoundChain | Decentralized Music NFTs',
        },
        timestamp: new Date().toISOString(),
      }],
    };

    const response = await axios.post(DISCORD_NFT_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status < 200 || response.status >= 300) {
      console.error(`[Discord] Failed to send edition notification: ${response.status}`);
      return false;
    }

    console.log(`[Discord] Edition mint notification sent for "${trackTitle}" (${editionSize} NFTs)`);
    return true;
  } catch (error) {
    console.error('[Discord] Error sending edition notification:', error);
    return false;
  }
}
