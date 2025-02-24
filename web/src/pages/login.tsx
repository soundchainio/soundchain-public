import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from 'components/common/Buttons/Button'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { FormValues, LoginForm } from 'components/LoginForm'
import SEO from 'components/SEO'
import { TopNavBarButton } from 'components/TopNavBarButton'
import { config } from 'config'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMagicContext } from 'hooks/useMagicContext'
import { Google } from 'icons/Google'
import { LeftArrow } from 'icons/LeftArrow'
import { LogoAndText } from 'icons/LogoAndText'
import { UserWarning } from 'icons/UserWarning'
import { setJwt } from 'lib/apollo'
import { AuthMethod, useLoginMutation, useMeQuery } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import { isApolloError } from '@apollo/client'

export default function LoginPage() {
  const [login] = useLoginMutation()
  const [loggingIn, setLoggingIn] = useState(false)
  const { data, loading: loadingMe } = useMeQuery()
  const me = data?.me
  const { magic } = useMagicContext()
  const router = useRouter()
  const magicParam = router.query.magic_credential?.toString()
  const [authMethod, setAuthMethod] = useState<AuthMethod[]>()
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext()

  const topNavBarProps = useMemo(
    () => ({
      isLogin: false,
      leftButton: <TopNavBarButton onClick={() => setAuthMethod(undefined)} label="Back" icon={LeftArrow} />,
    }),
    [],
  )

  const handleError = useCallback(
    (error: Error) => {
      if (isApolloError(error) && error.message === 'already exists') {
        setLoggingIn(false)
        setAuthMethod(error.graphQLErrors.find(err => err.extensions.with)?.extensions.with)
      } else if (error.message.toLowerCase().includes('invalid credentials')) {
        router.push('/create-account')
      } else {
        setLoggingIn(false)
        console.warn('warn: ', error)
      }
    },
    [router],
  )

  useEffect(() => {
    setTopNavBarProps(authMethod ? topNavBarProps : { isLogin: true })
    setIsAuthLayout(true)
  }, [setTopNavBarProps, setIsAuthLayout, authMethod, topNavBarProps])

  useEffect(() => {
    if (me) {
      setIsAuthLayout(false)
      router.push(router.query.callbackUrl?.toString() ?? `${config.redirectUrlPostLogin}`)
    }
  }, [me, router, setIsAuthLayout])

  const handleGoogleLogin = () => {
  window.open(
    `https://accounts.google.com/o/oauth2/auth?client_id=${config.googleClientId}&redirect_uri=${config.domainUrl}/login&response_type=code&scope=openid%20email%20profile`,
    '_blank',
    'noopener,noreferrer',
    })
  }

  useEffect(() => {
    function magicGoogle() {
      if (magic && router.query.magic_credential) {
        setLoggingIn(true)
        magic.oauth
          .getRedirectResult()
          .then(result => login({ variables: { input: { token: result.magic.idToken } } }))
          .then(result => setJwt(result.data?.login.jwt))
          .catch(handleError)
      }
    }
    magicGoogle()
  }, [magic, magicParam, login, handleError, router.query])

  async function handleSubmit(values: FormValues) {
    try {
      setLoggingIn(true)
      magic.preload()
      const token = await magic.auth.loginWithMagicLink({
        email: values.email,
      })

      if (!token) {
        throw new Error('Error connecting Magic')
      }

      const result = await login({ variables: { input: { token } } })
      setJwt(result.data?.login.jwt)
    } catch (error) {
      handleError(error as Error)
    }
  }

  const GoogleButton = () => (
    <button
      className="flex gap-2 rounded border border-gray-30 bg-gray-1A px-3 py-4 text-sm font-semibold text-white"
      onClick={handleGoogleLogin}
    >
      <Google className="mr-1 h-5 w-5" />
      <span>Login with Google</span>
    </button>
  )

  if (loadingMe || me) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex h-full w-full items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
        </div>
      </>
    )
  }

  if (loggingIn) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex h-full w-full items-center justify-center py-3 text-center font-bold sm:px-4">
          <LoaderAnimation ring />
          <span className="text-white">Logging in</span>
        </div>
      </>
    )
  }

  if (authMethod) {
    return (
      <>
        <SEO title="Login | SoundChain" description="Login warning" canonicalUrl="/login/" />
        <div className="flex justify-center pt-32 pb-6">
          <UserWarning />
        </div>
        <div className="py-4 text-center text-sm text-white">
          An account already exists with that email.
          <br />
          <br />
          If you wish to login to an existing account, you must login using the same login method you used previously:
        </div>
        {authMethod.includes(AuthMethod.Google) && <GoogleButton />}
        {authMethod.includes(AuthMethod.MagicLink) && <LoginForm handleMagicLogin={handleSubmit} />}
        <div className="flex h-full flex-col justify-between">
          <div className="py-4 text-center text-sm text-white">
            Alternatively, you may continue by creating a new account with the same email.
          </div>
          <NextLink href="/create-account">
            <Button variant="rainbow" borderColor="bg-purple-gradient">
              CREATE NEW ACCOUNT
            </Button>
          </NextLink>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Login | SoundChain" description="Log in to SoundChain" canonicalUrl="/login/" />
      <div className="mb-2 flex h-36 items-center justify-center">
        <LogoAndText />
      </div>
      <GoogleButton />
      <div className="py-7 text-center text-sm font-bold text-gray-50">OR</div>
      <LoginForm handleMagicLogin={handleSubmit} />
    </>
  )
}
