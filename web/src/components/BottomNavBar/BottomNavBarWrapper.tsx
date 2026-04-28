import { store } from 'contexts'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'
import { BottomNavBar } from './BottomNavBar'

// Route-prefixes where the legacy bottom pills must NEVER render. Adding a new
// surface here (e.g. '/arena/foo') is the one-line way to keep pills off — page
// authors don't need to remember to call useHideBottomNavBar. New nodeverse
// surfaces (gallery3d/explore3d/land/nodes) already use their own chrome and
// don't want the legacy pills either.
const PILL_FREE_ROUTES = ['/arena', '/gallery3d', '/explore3d', '/land', '/nodes', '/radio'] as const

const isPillFreeRoute = (path: string) => PILL_FREE_ROUTES.some(p => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))

export const BottomNavBarWrapper = () => {
  const { state } = useContext(store)
  const { hideBottomNavBar } = useHideBottomNavBar()
  const me = useMe()
  const router = useRouter()
  const routeForcesHidden = isPillFreeRoute(router.pathname || '')

  return (
    <>
      <div id="bottom-sheet"></div>
      <div className={`md:hidden`}>{!state?.modal.anyModalOpened && !hideBottomNavBar && !routeForcesHidden && me && <BottomNavBar />}</div>
    </>
  )
}
