/* eslint-disable @typescript-eslint/no-empty-interface */
import classNames from 'classnames';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import React from 'react';

interface PlayerAwareBottomBarProps {}

const PlayerAwareBottomBar = ({ children }: React.PropsWithChildren<PlayerAwareBottomBarProps>) => {
  const { currentSong } = useAudioPlayerContext();
  return (
    <div
      className={classNames(
        'bg-black text-white flex items-center py-3 px-4 fixed right-0 md:left-64 left-0',
        currentSong?.src ? 'bottom-36 md:bottom-16' : 'bottom-20 md:bottom-0',
      )}
    >
      {children}
    </div>
  );
};

export default PlayerAwareBottomBar;
