import { Button } from 'components/Button';
import { burnNftToken, getIpfsAssetUrl } from 'lib/blockchain';
import { useMimeTypeLazyQuery, useMimeTypeQuery } from 'lib/graphql';
import Image from 'next/image';
import { useEffect } from 'react';
import { NftToken } from 'types/NftTypes';
import Web3 from 'web3';
import { Subtitle } from './Subtitle';
import { Title } from './Title';

interface NftCardProps {
  account: string;
  web3: Web3;
  nftToken: NftToken;
}

export const NFTCard = ({ account, web3, nftToken }: NftCardProps) => {
  const { tokenId, asset, name, description, art, attributes } = nftToken;
  const assetURL = getIpfsAssetUrl(asset);
  const artURL = art && getIpfsAssetUrl(art);
  const { data: assetData } = useMimeTypeQuery({ variables: { url: getIpfsAssetUrl(asset) } });
  const [loadArtMimeType, { data: artData }] = useMimeTypeLazyQuery();

  useEffect(() => {
    if (artURL) {
      loadArtMimeType({ variables: { url: artURL } });
    }
  }, []);

  const handleBurn = async (web3: Web3, tokenId: string) => {
    const confirmed = confirm('Heey! This will destroy this NFT, you sure?');
    if (confirmed) {
      await burnNftToken(web3, tokenId, account);
      alert('Token burned!');
    }
  };

  if (!assetData) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-1 relative h-full mb-16">
      <Title>{name}</Title>
      <Subtitle>{description}</Subtitle>
      <div>
        {attributes &&
          attributes.map(({ trait_type, trait_value }, idx) => (
            <div key={idx} className="text-white text-sm">{`${trait_type}: ${trait_value}`}</div>
          ))}
      </div>
      <Asset src={artURL} mimeType={artData?.mimeType.value} art />
      <Asset src={assetURL} mimeType={assetData?.mimeType.value} />
      <div className="absolute bottom-0">
        <div className="flex space-x-2">
          <Button variant="rainbow-xs" className="">
            Transfer
          </Button>
          <Button variant="rainbow-xs" onClick={() => handleBurn(web3, tokenId)}>
            Burn
          </Button>
        </div>
        <a
          href={`https://mumbai.polygonscan.com/token/0x1ca9e523a3d4d2a771e22aaaf51eab33108c6b2c?a=${tokenId}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm yellow-gradient-text"
        >
          See on Polygonscan
        </a>
      </div>
    </div>
  );
};

const Asset = ({ src, mimeType, art }: { src: string | undefined; mimeType: string | undefined; art?: boolean }) => {
  if (!src || !mimeType) return null;

  if (mimeType === 'video/mp4') {
    return <video src={src} controls={!art} loop={art} muted={art} autoPlay={art} className="w-full" />;
  }

  if (mimeType === 'audio/mpeg') {
    return <audio src={src} controls className="w-full" />;
  }

  return (
    <div className="relative">
      <Image src={src} layout="fill" objectFit="contain" alt="" />
    </div>
  );
};
