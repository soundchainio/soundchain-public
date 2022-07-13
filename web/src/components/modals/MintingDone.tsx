import { Button } from 'components/Button';
import { MiniAudioPlayer } from 'components/MiniAudioPlayer';
import { Anchor } from 'icons/Anchor';
import { Polygon } from 'icons/Polygon';
import { network } from 'lib/blockchainNetworks';
import { CreateMultipleTracksMutation } from 'lib/graphql';
import NextLink from 'next/link';

interface MintingDoneProps {
  track: CreateMultipleTracksMutation['createMultipleTracks']['firstTrack'];
  transactionHash: string;
}

export const MintingDone = ({ track, transactionHash }: MintingDoneProps) => {
  return (
    <div className="h-full w-full" style={{ backgroundColor: '#101010' }}>
      <div className="p-4">
        <MiniAudioPlayer
          song={{
            src: track.playbackUrl,
            trackId: track.id,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
            isFavorite: track.isFavorite,
            playbackCount: track.playbackCountFormatted,
            favoriteCount: track.favoriteCount,
            saleType: track.saleType,
            price: track.price,
          }}
        />
      </div>
      <div
        className="h-96 p-4 flex flex-col justify-center items-center	bg-no-repeat text-center text-xl text-white font-black uppercase"
        style={{ backgroundImage: 'url(/congratulations.gif)', backgroundSize: '100% 100%' }}
      >
        <div style={{ color: '#808080' }}>Congrats,</div>
        <div>you created an NFT!</div>
        <NextLink href={`/tracks/${track.id}`}>
          <Button className="text-sm mt-6 w-1/3 rounded" variant="rainbow">
            NFT Details
          </Button>
        </NextLink>
      </div>
      <div className="flex gap-4 items-center text-xs text-white py-3 px-4" style={{ backgroundColor: '#151515' }}>
        <div className="flex items-center whitespace-nowrap font-bold">
          <Polygon />
          Token ID:
        </div>
        <div className="flex items-center gap-1 truncate">
          <Anchor style={{ minWidth: '8px' }} />
          <a
            className="truncate font-black "
            style={{ fontSize: '9px', lineHeight: '9px', borderBottom: '1px solid gray', color: '#808080' }}
            href={`${network.blockExplorer}/tx/${transactionHash}`}
            rel="noreferrer"
            target="_blank"
          >
            {transactionHash}
          </a>
        </div>
      </div>
    </div>
  );
};
