import { ExploreAll } from 'components/ExploreAll';
import { ExploreSearchBar } from 'components/ExploreSearchBar';
import { ExploreTabs } from 'components/ExploreTabs';
import { ExploreTracks } from 'components/ExploreTracks';
import { ExploreUsers } from 'components/ExploreUsers';
import React, { useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <div className="bg-black h-full overflow-hidden">
      <ExploreSearchBar setSearchTerm={setSearchTerm} />
      <ExploreTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      {selectedTab === ExploreTab.ALL && <ExploreAll setSelectedTab={setSelectedTab} searchTerm={searchTerm} />}
      {selectedTab === ExploreTab.USERS && <ExploreUsers searchTerm={searchTerm} />}
      {selectedTab === ExploreTab.TRACKS && <ExploreTracks searchTerm={searchTerm} />}
    </div>
  );
};
