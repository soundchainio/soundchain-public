import { store } from 'contexts'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import React, { useContext } from 'react'
import { BottomNavBar } from './BottomNavBar'

export const BottomNavBarWrapper = () => {
  const { state } = useContext(store)
  const { hideBottomNavBar } = useHideBottomNavBar()
  const me = useMe()

  return (
    <>
      <div id="bottom-sheet"></div>
      <div className={`md:hidden`}>{!state?.modal.anyModalOpened && !hideBottomNavBar && me && <BottomNavBar />}</div>
    </>
  )
}
