import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteTracks } from 'components/FavoriteTracks';
import { SearchLibrary } from 'components/SearchLibrary';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import React, { useEffect, useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
  leftButton: <BackButton />,
};

export default function FavoriteTracksPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Favorite Tracks | SoundChain"
        canonicalUrl="/library/favorite-tracks/"
        description="Your SoundChain favorite tracks"
      />
      <SearchLibrary placeholder="Search tracks..." setSearchTerm={setSearchTerm} />
      <FavoriteTracks searchTerm={searchTerm} />
    </>
  );
}
