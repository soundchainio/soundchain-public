/* eslint-disable @typescript-eslint/no-empty-interface */
import classNames from 'classnames'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import React from 'react'

interface PlayerAwareBottomBarProps {}

const PlayerAwareBottomBar = ({ children }: React.PropsWithChildren<PlayerAwareBottomBarProps>) => {
  const { currentSong } = useAudioPlayerContext()
  return (
    <div
      className={classNames(
        `mb-safe fixed right-0 left-0 flex items-center bg-black py-3 px-4 text-white`,
        currentSong?.src ? `bottom-36 md:bottom-16` : `bottom-20 md:bottom-0`,
      )}
    >
      {children}
    </div>
  )
}

export default PlayerAwareBottomBar
