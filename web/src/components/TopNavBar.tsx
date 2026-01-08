import { useEffect } from 'react'

import { Avatar } from 'components/Avatar'
import { Bell } from 'icons/Bell'
import { Logo } from 'icons/Logo'
import { getJwt } from 'lib/apollo'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMagicContext } from 'hooks/useMagicContext'
import { Users } from 'lucide-react'

import { Button } from './common/Buttons/Button'
import { SoundChainPopOver } from './common/PopOverButton/PopOverButton'
import { NavBar } from './NavBar'
import { NotificationBadge } from './NotificationBadge'
import { Notifications } from './Notifications'
import { SocialLinksPanel } from './SocialLinksPanel'
import { Title } from './Title'
import { TopNavBarButton } from './TopNavBarButton'

// Social/Follow Us icon for nav bar
const SocialIcon = () => (
  <Users className="w-6 h-6 text-gray-80 hover:text-purple-400 transition-colors" />
)

// Magic Wallet Button for nav bar - uses magic.wallet.connectWithUI()
const MagicWalletButton = () => {
  const { connectWallet, walletConnectedAddress, isConnectingWallet, account } = useMagicContext()

  const truncateAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-3)}`

  // Show connected external wallet or Magic wallet
  const displayAddress = walletConnectedAddress || account

  if (!displayAddress) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnectingWallet}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <span>🔗</span>
        <span className="hidden sm:inline">{isConnectingWallet ? 'Connecting...' : 'Connect'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={connectWallet}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-20 border border-gray-30 hover:border-cyan-500/50 rounded-lg transition-colors"
    >
      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
      <span className="text-xs text-cyan-400 font-mono">{truncateAddress(displayAddress)}</span>
      <span className="text-[10px] text-gray-500 hidden md:inline">(Polygon)</span>
    </button>
  )
}

export interface TopNavBarProps {
  setSideMenuOpen?: (open: boolean) => void
  leftButton?: JSX.Element
  rightButton?: JSX.Element
  title?: string
  subtitle?: JSX.Element
  isLogin?: boolean
}

export const TopNavBar = ({
  title,
  rightButton: RightButton,
  leftButton: LeftButton,
  subtitle: Subtitle,
  setSideMenuOpen,
  isLogin,
}: TopNavBarProps) => {
  const router = useRouter()
  const { data, loading: loadingMe, refetch } = useMeQuery()

  const me = data?.me

  useEffect(() => {
    async function checkLogin() {
      if (!me && !loadingMe && (await getJwt())) {
        await refetch()
      }
    }

    checkLogin()
  }, [me, loadingMe, refetch])

  const onLogin = () => {
    router.push('/login')
  }

  if (isLogin) return null

  const isLoginPage = router.pathname === '/login'
  const isCreateAccount = router.pathname === '/create-account'

  return (
    <header>
      <div className="relative z-10 grid h-16 grid-cols-3 bg-black shadow sm:grid-cols-6">
        <Link href="/dex" className="flex-grow-basis flex items-center pl-4 md:hidden" passHref>
          <Logo id="logo_mobile" className="block h-8 w-auto" />
        </Link>
        {me ? (
          <div className="col-span-3 hidden w-full flex-1 items-stretch justify-start pl-4 md:flex">
            <div className="flex w-full items-center">
              <NavBar />
            </div>
          </div>
        ) : (
          !isLoginPage &&
          !isCreateAccount &&
          !me && (
            <div className="ml-4 flex flex-2 items-center justify-start space-x-2 ">
              <Button
                variant="outline"
                onClick={onLogin}
                className="h-8 w-32 bg-opacity-70"
                borderColor="bg-gray-40"
                bgColor="bg-black"
              >
                Login / Sign up
              </Button>
            </div>
          )
        )}
        <div className="flex items-center justify-center sm:col-span-2">
          {title && (
            <div>
              <Title navTitle className="truncate text-center text-sm md:text-left">
                {title}
              </Title>
              {Subtitle}
            </div>
          )}
        </div>
        <div className="h-full items-center text-gray-80 sm:col-span-1">
          <div className="flex h-full items-center justify-end gap-4 pr-4 md:gap-4 md:pr-10">
            <div className={`flex-grow-basis-0 flex items-center gap-2`}>
              {(LeftButton || RightButton) && (
                <>
                  {LeftButton && <>{LeftButton}</>}
                  {RightButton && <>{RightButton}</>}
                </>
              )}
            </div>
            {me && (
              <>
                <MagicWalletButton />
                {/* Follow Us / Social Links */}
                <div className="pr-1 pt-2">
                  <SoundChainPopOver icon={SocialIcon}>
                    <SocialLinksPanel />
                  </SoundChainPopOver>
                </div>
                {/* Notifications */}
                <div className="pr-1 pt-2">
                  <SoundChainPopOver icon={Bell} badge={NotificationBadge}>
                    <Notifications />
                  </SoundChainPopOver>
                </div>
                <TopNavBarButton
                  icon={({}) => (
                    <Avatar linkToProfile={false} profile={{ profilePicture: me?.profile.profilePicture }} />
                  )}
                  label=""
                  onClick={() => setSideMenuOpen && setSideMenuOpen(true)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
