import { store } from 'contexts'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'
import { BottomNavBar } from './BottomNavBar'

// Route-prefixes where the legacy bottom pills must NEVER render. The pill-hide
// decision lives here (single source) instead of being repeated as a useEffect
// on every new arena/nodeverse subroute. Bug #73 reopened twice because the
// per-page hook was easy to forget when adding /arena/picks, /arena/fantasy,
// /arena/fantasy/[id]. Adding a new pill-free route family = one line below.
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
