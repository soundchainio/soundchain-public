import React, { forwardRef } from 'react';
import { Profile, Track } from 'lib/graphql';
import TrackGrid from './TrackGrid';
import { ProfileGridItem } from './ProfileGridItem';

interface GridItemProps<T> {
  variant: 'track' | 'profile';
  handleOnPlayClicked?: (index: number) => void;
  index?: number;
  item: T;
  ref?: React.Ref<HTMLDivElement>;
  walletProvider?: any; // Pass walletProvider to TrackGrid
  getContractAddress?: (token: string, chainId?: number) => string; // Pass getContractAddress to TrackGrid
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps<Track | Profile>>((props, ref) => {
  const { variant, item, handleOnPlayClicked, index, walletProvider, getContractAddress } = props;
  if (!item) return null;
  if (variant === 'track') {
    if (!handleOnPlayClicked) return null;
    const _item = item as Track;
    return (
      <TrackGrid
        track={_item}
        coverPhotoUrl={_item.artworkUrl || ''}
        handleOnPlayClicked={() => handleOnPlayClicked(index || 0)}
        ref={ref}
        walletProvider={walletProvider} // Pass walletProvider
        getContractAddress={getContractAddress} // Pass getContractAddress
      />
    );
  }
  if (variant === 'profile') {
    const _item = item as Profile;
    return <ProfileGridItem profile={_item} />;
  }
  return null;
});
