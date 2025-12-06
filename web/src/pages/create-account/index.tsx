import { useEffect, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Form, Formik, FormikHelpers } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMagicContext } from 'hooks/useMagicContext'
import { setJwt } from 'lib/apollo'
import { useRegisterMutation } from 'lib/graphql'
import { useRouter } from 'next/dist/client/router'
import Link from 'next/link'
import { formatValidationErrors } from 'utils/errorHelpers'
import { handleRegex } from 'utils/Validation'
import * as yup from 'yup'

interface FormValues {
  displayName: string
  handle: string
}

const topNavBarProps: TopNavBarProps = {}

export const HANDLE_MAX_CHARS = 24 // Original value, adjust to 30 or other if desired

export default function CreateAccountPage() {
  const router = useRouter()
  const { magic } = useMagicContext()
  const [register, { loading }] = useRegisterMutation()
  const [email, setEmail] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false)
  const { setTopNavBarProps, setIsAuthLayout } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setIsAuthLayout(true)
  }, [setTopNavBarProps, setIsAuthLayout])

  useEffect(() => {
    async function isLoggedInMagic() {
      if (magic) {
        const user = magic.user
        const isLoggedIn = await user?.isLoggedIn()

        if (user && isLoggedIn) {
          const token = await user.getIdToken()
          const metaData = await magic.user.getInfo()
          const email = metaData?.email
          setToken(token)
          email && setEmail(email)
        } else {
          router.push('/login')
        }
      }
    }
    isLoggedInMagic()
    // TODO: fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic, router])

  const toggleTerms = () => {
    setTermsAccepted(!termsAccepted)
  }

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: { token, ...values } } })
      setJwt(data?.register.jwt)
      router.push(router.query.callbackUrl?.toString() ?? '/create-account/profile-picture')
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0])
      setErrors(formatted)
    }
  }

  const validationSchema: yup.Schema<FormValues> = yup.object().shape({
    displayName: yup.string().min(3).max(255).required().label('Name'),
    handle: yup
      .string()
      .min(1)
      .max(HANDLE_MAX_CHARS)
      .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
      .required()
      .label('Username'),
  })

  const initialValues = {
    displayName: '',
    handle: '',
  }

  if (!email || !token) {
    return null
  }

  return (
    <>
      <SEO
        title="Create Account | SoundChain"
        canonicalUrl="/create-account/"
        description="Create your account on SoundChain"
      />
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {(formikProps) => (
          <Form
            className="flex flex-1 flex-col"
            autoComplete="off"
            {...(formikProps as any)} // Spread Formik props to satisfy additional HTML attributes
          >
            <div className="mb-auto flex flex-col space-y-6">
              <div className="space-y-3">
                <InputField label="Name" type="text" name="displayName" />
              </div>
              <div className="space-y-3">
                <InputField
                  label={`Enter username. (Only letters and numbers allowed. Max of ${HANDLE_MAX_CHARS} characters)`}
                  type="text"
                  name="handle"
                  maxLength={HANDLE_MAX_CHARS}
                />
              </div>
            </div>
            <div className="mb-6 flex items-start gap-4 text-center text-xs font-thin text-white sm:items-center">
              <input
                type="checkbox"
                id="termsCheckbox"
                className="h-5 w-5 rounded border-2 border-green-500 bg-black text-green-500 focus:ring-0"
                onChange={toggleTerms}
              />
              <div className="relative">
                <label htmlFor="termsCheckbox">I agree to the SoundChain’s</label>
                <Link href={`/terms-and-conditions`} passHref className="relative px-2 text-white underline">
                  <span className="after:absolute after:-inset-1">Terms & Conditions</span>
                </Link>
                and
                <Link href={`/privacy-policy`} passHref className="relative px-2 text-white underline">
                  <span className="after:absolute after:-inset-1">Privacy Policy.</span>
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className={'transition ' + (termsAccepted ? 'opacity-100' : 'opacity-50')}
              loading={loading}
              disabled={loading || !termsAccepted}
            >
              CREATE ACCOUNT
            </Button>
          </Form>
        )}
      </Formik>
    </>
  )
}
