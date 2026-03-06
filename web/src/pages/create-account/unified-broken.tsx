/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
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
import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm'
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm'
import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm'
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm'
import { BioForm } from 'components/forms/profile/BioForm'
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm'
import { SecurityForm } from 'components/forms/profile/SecurityForm'
import { config } from 'config'
import styled from 'styled-components'

interface FormValues {
  displayName: string
  handle: string
}

const topNavBarProps: TopNavBarProps = {}

export const HANDLE_MAX_CHARS = 24

const UnifiedContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  border-radius: 16px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`

const SectionTitle = styled.h2`
  color: #ffd700;
  font-size: 24px;
  font-weight: 800;
  margin: 32px 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);

  &:first-of-type {
    margin-top: 0;
  }
`

const SectionSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0 0 20px 0;
`

const FormSection = styled.div`
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const OptionalBadge = styled.span`
  background: rgba(0, 212, 170, 0.2);
  color: #00d4aa;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
  text-transform: lowercase;
`

const ProgressBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(135deg, #0f0c29, #302b63);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 2px solid rgba(255, 215, 0, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`

const ProgressTitle = styled.div`
  color: #ffd700;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
`

const ProgressSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
`

const ProgressStep = styled.div<{ $completed: boolean }>`
  height: 8px;
  background: ${props => props.$completed
    ? 'linear-gradient(90deg, #ffd700, #ffed4e)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 4px;
  transition: all 0.3s ease;
`

export default function UnifiedCreateAccountPage() {
  const router = useRouter()
  const { magic } = useMagicContext()
  const [register, { loading }] = useRegisterMutation()
  const [email, setEmail] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false)
  const [accountCreated, setAccountCreated] = useState<boolean>(false)
  const [completedSteps, setCompletedSteps] = useState<number>(0)
  const { setTopNavBarProps, setIsAuthLayout, setHideBottomNavBar } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setIsAuthLayout(true)
    setHideBottomNavBar(true)

    return () => {
      setHideBottomNavBar(false)
    }
  }, [setTopNavBarProps, setIsAuthLayout, setHideBottomNavBar])

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
  }, [magic, router])

  const toggleTerms = () => {
    setTermsAccepted(!termsAccepted)
  }

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: { token, ...values } } })
      setJwt(data?.register.jwt)
      setAccountCreated(true)
      setCompletedSteps(1)
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0])
      setErrors(formatted)
    }
  }

  const handleSectionComplete = () => {
    setCompletedSteps(prev => Math.min(prev + 1, 7))
  }

  const handleFinalSubmit = () => {
    router.push(config.redirectUrlPostLogin)
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
        canonicalUrl="/create-account/unified"
        description="Create your account on SoundChain - One simple page"
      />
      <UnifiedContainer>
        <ProgressBar>
          <ProgressTitle>⭐ Account Setup Progress</ProgressTitle>
          <ProgressSteps>
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <ProgressStep key={step} $completed={completedSteps >= step} />
            ))}
          </ProgressSteps>
        </ProgressBar>

        {!accountCreated ? (
          <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
            {(formikProps) => (
              <Form className="flex flex-1 flex-col" autoComplete="off" {...(formikProps as any)}>
                <FormSection>
                  <SectionTitle>🎯 Basic Information</SectionTitle>
                  <SectionSubtitle>Let's start with your name and username</SectionSubtitle>

                  <div className="space-y-6">
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

                  <div className="mb-6 mt-6 flex items-start gap-4 text-center text-xs font-thin text-white sm:items-center">
                    <input
                      type="checkbox"
                      id="termsCheckbox"
                      className="h-5 w-5 rounded border-2 border-green-500 bg-black text-green-500 focus:ring-0"
                      onChange={toggleTerms}
                    />
                    <div className="relative">
                      <label htmlFor="termsCheckbox">I agree to the SoundChain's</label>
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
                    className={'w-full transition ' + (termsAccepted ? 'opacity-100' : 'opacity-50')}
                    loading={loading}
                    disabled={loading || !termsAccepted}
                  >
                    CREATE ACCOUNT & CONTINUE
                  </Button>
                </FormSection>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="space-y-8">
            <FormSection>
              <SectionTitle>
                📸 Profile Picture
                <OptionalBadge>optional - skip if you want</OptionalBadge>
              </SectionTitle>
              <ProfilePictureForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-blue-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                🎨 Cover Photo
                <OptionalBadge>optional</OptionalBadge>
              </SectionTitle>
              <CoverPictureForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-blue-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                🎵 Favorite Genres
                <OptionalBadge>optional</OptionalBadge>
              </SectionTitle>
              <SectionSubtitle>Help us recommend music you'll love</SectionSubtitle>
              <FavoriteGenresForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-blue-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                🎤 Musician Type
                <OptionalBadge>optional</OptionalBadge>
              </SectionTitle>
              <SectionSubtitle>Are you a producer, artist, DJ, or something else?</SectionSubtitle>
              <MusicianTypesForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-blue-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                ✍️ Bio
                <OptionalBadge>optional</OptionalBadge>
              </SectionTitle>
              <SectionSubtitle>Tell the world about yourself</SectionSubtitle>
              <BioForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-blue-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                🔗 Social Links
                <OptionalBadge>optional</OptionalBadge>
              </SectionTitle>
              <SectionSubtitle>Connect your social media profiles</SectionSubtitle>
              <SocialLinksForm
                afterSubmit={handleSectionComplete}
                submitText="SAVE & CONTINUE"
                submitProps={{ borderColor: 'bg-green-gradient' }}
              />
            </FormSection>

            <FormSection>
              <SectionTitle>
                🔒 Two-Factor Security
                <OptionalBadge>optional but recommended</OptionalBadge>
              </SectionTitle>
              <SectionSubtitle>Protect your account with 2FA</SectionSubtitle>
              <SecurityForm afterSubmit={handleSectionComplete} />
            </FormSection>

            <FormSection style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 212, 170, 0.1))' }}>
              <SectionTitle>🎉 All Done!</SectionTitle>
              <SectionSubtitle>
                You can always update these settings later. Ready to start your Web3 music journey?
              </SectionSubtitle>
              <Button
                onClick={handleFinalSubmit}
                className="w-full"
                borderColor="bg-green-gradient"
              >
                ✓ COMPLETE SETUP & GO TO SOUNDCHAIN
              </Button>
            </FormSection>
          </div>
        )}
      </UnifiedContainer>
    </>
  )
}
