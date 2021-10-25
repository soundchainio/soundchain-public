import { ExploreAll } from 'components/ExploreAll';
import { ExploreTabs } from 'components/ExploreTabs';
import { ExploreTracks } from 'components/ExploreTracks';
import { ExploreUsers } from 'components/ExploreUsers';
import React, { useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';

interface ExplorePageProps {
  searchTerm?: string;
}

export const Explore = ({ searchTerm }: ExplorePageProps) => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);

  return (
    <div className="pt-2 bg-black">
      <ExploreTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      {selectedTab === ExploreTab.ALL && <ExploreAll setSelectedTab={setSelectedTab} searchTerm={searchTerm} />}
      {selectedTab === ExploreTab.USERS && <ExploreUsers searchTerm={searchTerm} />}
      {selectedTab === ExploreTab.TRACKS && <ExploreTracks searchTerm={searchTerm} />}
    </div>
  );
};
