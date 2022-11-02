import { Bell } from 'icons/Bell'
import { Logo } from 'icons/Logo'
import { getJwt } from 'lib/apollo'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Avatar } from './Avatar'
import { Button } from './common/Buttons/Button'
import { NavBar } from './NavBar'
import { NotificationBadge } from './NotificationBadge'
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
      <div className="relative z-10 flex h-16 flex-shrink-0 bg-black shadow">
        <Link href="/home">
          <a className="flex-grow-basis flex items-center pl-4 md:hidden">
            <Logo id="logo_mobile" className="block h-8 w-auto" />
          </a>
        </Link>
        {me ? (
          <div className="hidden w-full flex-1 items-stretch justify-start pl-4 md:flex">
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
        <div className="ml-4 flex items-center">
          <div className="flex w-full flex-shrink-0 items-center justify-center">
            {title && (
              <div className="flex w-full flex-col">
                <Title navTitle className="truncate text-center text-sm md:text-left">
                  {title}
                </Title>
                {Subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex-grow-basis-0 h-full flex-1 items-center text-gray-80">
          <div className="flex h-full items-center justify-end gap-2 pr-4 md:gap-4 md:pr-10">
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
                  <TopNavBarButton path={'/notifications'} icon={Bell} label="" badge={NotificationBadge} />
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
