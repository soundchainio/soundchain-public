/* eslint-disable @typescript-eslint/no-empty-interface */
import classNames from 'classnames';
import { config } from 'config';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import React from 'react';

interface PlayerAwareBottomBarProps {}

const PlayerAwareBottomBar = ({ children }: React.PropsWithChildren<PlayerAwareBottomBarProps>) => {
  const { currentSong } = useAudioPlayerContext();
  return (
    <div
      className={classNames(
        `bg-black text-white flex items-center py-3 px-4 fixed right-0 ${config.mobileBreakpoint}:left-64 left-0 mb-safe`,
        currentSong?.src ? `bottom-[170px]` : `bottom-20 `,
      )}
    >
      {children}
    </div>
  );
};

export default PlayerAwareBottomBar;
