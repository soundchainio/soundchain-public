import { useEffect } from 'react'

import { Avatar } from 'components/Avatar'
import { Bell } from 'icons/Bell'
import { Logo } from 'icons/Logo'
import { getJwt } from 'lib/apollo'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { Button } from './common/Buttons/Button'
import { SoundChainPopOver } from './common/PopOverButton/PopOverButton'
import { NavBar } from './NavBar'
import { NotificationBadge } from './NotificationBadge'
import { Notifications } from './Notifications'
import { Title } from './Title'
import { TopNavBarButton } from './TopNavBarButton'

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
