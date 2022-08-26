import { useModalDispatch } from 'contexts/providers/modal'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home } from 'icons/Home'
import { Library } from 'icons/Library'
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar'
import { NewPost } from 'icons/NewPost'
import { Search } from 'icons/Search'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { NavBarButton } from './Buttons/NavBarButton'

export const BottomNavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const router = useRouter()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  useEffect(() => {
    if (process.browser) {
      window.onbeforeunload = e => {
        if (isMinting) {
          return 'You are minting an NFT. You should not leave SoundChain!'
        }
        e.preventDefault()
      }
    }
  }, [isMinting])

  return (
    <nav id="bottom-nav-bar" className="inset-x-0 flex items-center bg-black py-3 shadow-2xl md:hidden">
      <div className="w-full">
        <div className="flex w-full items-end">
          <NavBarButton label="Home" path="/home" icon={Home} color="yellow" alwaysShowLabel />
          <NavBarButton
            id="nav-explore-"
            label="Explore"
            path={me ? '/explore' : '/login'}
            icon={Search}
            color="green"
            alwaysShowLabel
          />
          {isMinting ? (
            <NavBarButton label="Minting..." nyanCat={true} onClick={handleCreateClick} alwaysShowLabel />
          ) : (
            <NavBarButton label="Create" icon={NewPost} onClick={handleCreateClick} alwaysShowLabel />
          )}
          <NavBarButton
            id="nav-library-"
            label="Library"
            path={me ? '/library' : '/login'}
            icon={Library}
            color="purple"
            alwaysShowLabel
          />
          <NavBarButton
            id="nav-market-"
            label="Market"
            icon={MarketplaceNavBar}
            color="purple-green"
            path={'/marketplace'}
            alwaysShowLabel
          />
        </div>
      </div>
    </nav>
  )
}
