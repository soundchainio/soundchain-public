import { useModalDispatch } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home } from 'icons/Home'
import { Library } from 'icons/Library'
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar'
import { NewPost } from 'icons/NewPost'
import { Search } from 'icons/Search'
import { DEX } from 'icons/DEX'
import { Backend } from 'icons/Backend'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { Logo } from '../icons/Logo'
import { NavBarButton } from './common/Buttons/NavBarButton'

export const NavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const router = useRouter()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  return (
    <nav className="inset-x-0 flex h-16 items-center bg-black shadow-2xl">
      <div className="flex w-full justify-center gap-6">
        <Link href="/" passHref>
          <Logo className="block h-8 w-auto hover:cursor-pointer" />
        </Link>

        <NavBarButton label="Home" path="/dex" icon={Home} color="yellow" id="top" alwaysShowLabel />
        <NavBarButton
          id="top-explore-"
          label="Explore"
          path={me ? '/explore' : '/login'}
          icon={Search}
          color="green"
          alwaysShowLabel
        />
        <NavBarButton
          id="top-library-"
          label="Library"
          path={me ? '/library' : '/login'}
          icon={Library}
          color="purple"
          alwaysShowLabel
        />
        <NavBarButton
          id="top-marketplace-"
          label="Market"
          icon={MarketplaceNavBar}
          color="purple-green"
          path={'/marketplace'}
          alwaysShowLabel
        />
        {isMinting ? (
          <NavBarButton label="Minting..." alwaysShowLabel nyanCat={true} onClick={handleCreateClick} />
        ) : (
          <NavBarButton label="Create+" alwaysShowLabel icon={NewPost} onClick={handleCreateClick} />
        )}
        <NavBarButton
          id="top-dex-"
          label="DEX"
          icon={DEX}
          color="green-yellow"
          path={'/dex'}
          alwaysShowLabel
        />
        <NavBarButton
          id="top-backend-"
          label="Backend"
          icon={Backend}
          color="cyan"
          path={'/backend'}
          alwaysShowLabel
        />
      </div>
    </nav>
  )
}
