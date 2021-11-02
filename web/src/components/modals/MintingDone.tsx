import { AudioPlayer } from 'components/AudioPlayer';
import { Anchor } from 'icons/Anchor';
import { Polygon } from 'icons/Polygon';
import { CreateTrackMutation } from 'lib/graphql';
import Image from 'next/image';
import React from 'react';

interface MintingDoneProps {
  track: CreateTrackMutation['createTrack']['track'];
  transactionHash: string;
}

export const MintingDone = ({ track, transactionHash }: MintingDoneProps) => {
  return (
    <div className="h-full w-full" style={{ backgroundColor: '#101010' }}>
      <div className="p-4">
        <AudioPlayer
          trackId={track.id}
          title={track.title}
          src={track.playbackUrl}
          art={track.artworkUrl}
          artist={track.artist}
        />
      </div>
      <div
        className="h-96 p-4 flex flex-col justify-center items-center	bg-no-repeat text-center text-xl text-white font-black uppercase"
        style={{ backgroundImage: 'url(/congratulations.gif)', backgroundSize: '100% 100%' }}
      >
        <div style={{ color: '#808080' }}>Congrats,</div>
        <div>you created an NFT!</div>
      </div>
      <div className="flex">
        <div className="uppercase mr-auto text-xs font-bold py-3 px-4" style={{ color: '#CCCCCC' }}>
          Mining Status
        </div>
        <div
          className="flex gap-2 items-center py-3 px-4 text-white font-bold text-xs"
          style={{ backgroundColor: '#252525' }}
        >
          <>
            <Image width={16} height={16} priority src="/loading.gif" alt="" /> In progress...
          </>
        </div>
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
            href={`https://mumbai.polygonscan.com/tx/${transactionHash}`}
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
