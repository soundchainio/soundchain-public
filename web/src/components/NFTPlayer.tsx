import WebTorrent from 'webtorrent';
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

const NFTPlayer = ({ cid, type = 'audio' }: { cid: string; type?: 'audio' | 'video' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const torrent = new WebTorrent();
    const pinataUrl = `https://soundchain.mypinata.cloud/ipfs/${cid}`;
    torrent.add(pinataUrl, { announce: ['wss://tracker.openwebtorrent.com'] });

    torrent.on('torrent', t => {
      const file = t.files[0]; // Audio/video file
      file.renderTo(videoRef.current!, { fit: 'cover' });
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(file.magnetURI);
        hls.attachMedia(videoRef.current!);
      }
    });

    return () => torrent.destroy();
  }, [cid, type]);

  return (
    <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
      <video ref={videoRef} controls className="w-full h-full">
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default NFTPlayer;
