import { ExploreAll } from 'components/ExploreAll';
import { ExploreTabs } from 'components/ExploreTabs';
import { ExploreTracks } from 'components/ExploreTracks';
import { ExploreUsers } from 'components/ExploreUsers';
import React, { useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);

  return (
    <div className="bg-black h-full overflow-hidden">
      <ExploreTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      {selectedTab === ExploreTab.ALL && <ExploreAll setSelectedTab={setSelectedTab} />}
      {selectedTab === ExploreTab.USERS && <ExploreUsers />}
      {selectedTab === ExploreTab.TRACKS && <ExploreTracks />}
    </div>
  );
};
