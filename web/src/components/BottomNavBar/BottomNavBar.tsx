import { useModalDispatch } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home } from 'icons/Home'
import { Inbox } from 'icons/Inbox'
import { Library } from 'icons/Library'
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar'
import { NewPost } from 'icons/NewPost'
import { Search } from 'icons/Search'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { NavBarButton } from 'components/common/Buttons/NavBarButton'
import { InboxBadge } from 'components/InboxBadge'

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

  const InboxBadgeWrapper = () => {
    return <InboxBadge showUnreadCount={false} />
  }

  return (
    <nav id="bottom-nav-bar" className="inset-x-0 flex items-center bg-black py-3 shadow-2xl md:hidden">
      <div className="w-full">
        <div className="flex w-full items-end">
          <NavBarButton label="" path="/dex" icon={Home} color="yellow" alwaysShowLabel />
          <NavBarButton
            id="nav-explore-"
            label=""
            path={me ? '/explore' : '/login'}
            icon={Search}
            color="green"
            alwaysShowLabel
          />
          {isMinting ? (
            <NavBarButton label="" nyanCat={true} onClick={handleCreateClick} alwaysShowLabel />
          ) : (
            <NavBarButton label="" icon={NewPost} onClick={handleCreateClick} alwaysShowLabel />
          )}
          <NavBarButton
            id="nav-library-"
            label=""
            path={me ? '/library' : '/login'}
            icon={Library}
            color="purple"
            alwaysShowLabel
          />
          <NavBarButton
            id="nav-market-"
            label=""
            icon={MarketplaceNavBar}
            color="purple-green"
            path={'/marketplace'}
            alwaysShowLabel
          />
          <NavBarButton
            id="nav-market-"
            label=""
            icon={Inbox}
            color="purple-green"
            path={me ? '/messages' : '/login'}
            badge={me ? InboxBadgeWrapper : undefined}
            alwaysShowLabel
          />
        </div>
      </div>
    </nav>
  )
}
