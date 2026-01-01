import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { config } from 'config'
import { ChainLink } from 'icons/ChainLink'
import { Pinata } from 'icons/Pinata'
import { Token } from 'icons/Token'
import { Profile } from 'lib/graphql'

interface MintingDataProps {
  ipfsCid?: string | null
  transactionHash?: string | null
  ownerProfile?: Partial<Profile>
  collaborators?: { walletAddress: string; royaltyPercentage: number; role: string }[]
  chain?: string
  account?: string // New prop for WalletConnect account
}

// Comprehensive chain explorer mapping for all supported chains
const CHAIN_EXPLORERS: Record<string, string> = {
  // Layer 1
  'Polygon': 'https://polygonscan.com/tx/',
  'polygon': 'https://polygonscan.com/tx/',
  'Ethereum': 'https://etherscan.io/tx/',
  'ethereum': 'https://etherscan.io/tx/',
  'Solana': 'https://explorer.solana.com/tx/',
  'solana': 'https://explorer.solana.com/tx/',
  'Avalanche': 'https://snowtrace.io/tx/',
  'avalanche': 'https://snowtrace.io/tx/',
  'Bitcoin': 'https://mempool.space/tx/',
  'bitcoin': 'https://mempool.space/tx/',
  // Layer 2
  'Arbitrum': 'https://arbiscan.io/tx/',
  'arbitrum': 'https://arbiscan.io/tx/',
  'Optimism': 'https://optimistic.etherscan.io/tx/',
  'optimism': 'https://optimistic.etherscan.io/tx/',
  'Base': 'https://basescan.org/tx/',
  'base': 'https://basescan.org/tx/',
  'Blast': 'https://blastscan.io/tx/',
  'blast': 'https://blastscan.io/tx/',
  // Omnichain
  'ZetaChain': 'https://explorer.zetachain.com/tx/',
  'zetachain': 'https://explorer.zetachain.com/tx/',
  // Specialized
  'Zora': 'https://explorer.zora.energy/tx/',
  'zora': 'https://explorer.zora.energy/tx/',
  'Ronin': 'https://explorer.roninchain.com/tx/',
  'ronin': 'https://explorer.roninchain.com/tx/',
  // Other
  'BSC': 'https://bscscan.com/tx/',
  'bsc': 'https://bscscan.com/tx/',
  'Tezos': 'https://tzstats.com/',
  'tezos': 'https://tzstats.com/',
  'Fantom': 'https://ftmscan.com/tx/',
  'fantom': 'https://ftmscan.com/tx/',
  'Cronos': 'https://cronoscan.com/tx/',
  'cronos': 'https://cronoscan.com/tx/',
  'Gnosis': 'https://gnosisscan.io/tx/',
  'gnosis': 'https://gnosisscan.io/tx/',
  'Celo': 'https://celoscan.io/tx/',
  'celo': 'https://celoscan.io/tx/',
  'Moonbeam': 'https://moonscan.io/tx/',
  'moonbeam': 'https://moonscan.io/tx/',
  'zkSync': 'https://explorer.zksync.io/tx/',
  'zksync': 'https://explorer.zksync.io/tx/',
  'Linea': 'https://lineascan.build/tx/',
  'linea': 'https://lineascan.build/tx/',
  'Scroll': 'https://scrollscan.com/tx/',
  'scroll': 'https://scrollscan.com/tx/',
  'Mantle': 'https://explorer.mantle.xyz/tx/',
  'mantle': 'https://explorer.mantle.xyz/tx/',
  'Manta': 'https://pacific-explorer.manta.network/tx/',
  'manta': 'https://pacific-explorer.manta.network/tx/',
  'Mode': 'https://explorer.mode.network/tx/',
  'mode': 'https://explorer.mode.network/tx/',
}

export const MintingData = ({ ipfsCid, transactionHash, ownerProfile, collaborators, chain, account }: MintingDataProps) => {
  const getChainExplorer = (chainName: string | undefined) => {
    if (!chainName) return 'https://polygonscan.com/tx/';
    return CHAIN_EXPLORERS[chainName] || CHAIN_EXPLORERS[chainName.toLowerCase()] || 'https://polygonscan.com/tx/';
  };

  return (
    <>
      <div className="flex items-center bg-gray-10 font-bold">
        <div className="flex w-2/4 flex-shrink-0 items-center gap-2 py-3 pl-4 text-xs text-gray-CC">
          <Pinata />
          Pinata IPFS
        </div>
        <div className="flex items-center overflow-hidden py-3 pr-4 text-sm">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <a
            href={`${config.ipfsGateway}${ipfsCid}`}
            target="_blank"
            className="overflow-hidden overflow-ellipsis text-xxs text-gray-80"
            rel="noreferrer"
          >
            {ipfsCid}
          </a>
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="flex w-2/4 flex-shrink-0 items-center gap-2 py-3 pl-4 text-xs text-gray-CC">
          <Token />
          Token ID
        </div>
        <div className="flex items-center overflow-hidden py-3 pr-4 text-sm">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <a
            href={`${getChainExplorer(chain)}${transactionHash}`}
            target="_blank"
            className="overflow-hidden overflow-ellipsis text-xxs text-gray-80"
            rel="noreferrer"
          >
            {transactionHash}
          </a>
        </div>
      </div>
      {ownerProfile && (
        <div className="flex items-center px-4 py-3 pb-20 text-xxs text-white">
          <div className="mr-1 w-1/6 text-xs font-bold uppercase text-gray-CC">Owner</div>
          <div className="w-3/6">
            <ProfileWithAvatar profile={ownerProfile} />
          </div>
          <div className="flex w-1/6 flex-col">
            <div className="text-center text-sm font-bold">{ownerProfile?.followerCount}</div>
            <div className="text-center font-bold text-gray-CC">Followers</div>
          </div>
          <div className="flex w-1/6 flex-col">
            <div className="text-center text-sm font-bold">{ownerProfile?.followingCount}</div>
            <div className="text-center font-bold text-gray-CC">Following</div>
          </div>
        </div>
      )}
      {chain && (
        <div className="flex items-center px-4 py-3 text-xxs text-white">
          <div className="mr-1 w-1/6 text-xs font-bold uppercase text-gray-CC">Chain</div>
          <div className="w-3/6">{chain}</div>
        </div>
      )}
      {account && (
        <div className="flex items-center px-4 py-3 text-xxs text-white">
          <div className="mr-1 w-1/6 text-xs font-bold uppercase text-gray-CC">Connected Wallet</div>
          <div className="w-3/6">{account}</div>
        </div>
      )}
      {collaborators && collaborators.length > 0 && (
        <div className="flex flex-col px-4 py-3 text-xxs text-white">
          <div className="mr-1 text-xs font-bold uppercase text-gray-CC">Collaborators</div>
          {collaborators.map((collaborator, index) => (
            <div key={index} className="flex items-center gap-2">
              <span>{collaborator.role}: {collaborator.walletAddress} ({collaborator.royaltyPercentage}%)</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
