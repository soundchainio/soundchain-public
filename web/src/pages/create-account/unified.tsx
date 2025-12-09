/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'
import { Form, Formik, FormikHelpers } from 'formik'
import { useRouter } from 'next/dist/client/router'
import Link from 'next/link'
import * as yup from 'yup'
import { User, Image as ImageIcon, Music, Mic2, FileText, Link2, Shield, CheckCircle2, ChevronDown } from 'lucide-react'

import SEO from 'components/SEO'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMagicContext } from 'hooks/useMagicContext'
import { setJwt } from 'lib/apollo'
import { useRegisterMutation } from 'lib/graphql'
import { formatValidationErrors } from 'utils/errorHelpers'
import { handleRegex } from 'utils/Validation'
import { config } from 'config'

import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm'
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm'
import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm'
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm'
import { BioForm } from 'components/forms/profile/BioForm'
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm'
import { SecurityForm } from 'components/forms/profile/SecurityForm'
import { Card, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'

interface FormValues {
  displayName: string
  handle: string
}

export const HANDLE_MAX_CHARS = 24

// Section configuration
const sections = [
  { id: 'basics', title: 'Basic Info', icon: User, required: true },
  { id: 'profile-picture', title: 'Profile Picture', icon: ImageIcon, required: false },
  { id: 'cover-picture', title: 'Cover Photo', icon: ImageIcon, required: false },
  { id: 'genres', title: 'Favorite Genres', icon: Music, required: false },
  { id: 'musician-type', title: 'Musician Type', icon: Mic2, required: false },
  { id: 'bio', title: 'Bio', icon: FileText, required: false },
  { id: 'social-links', title: 'Social Links', icon: Link2, required: false },
  { id: 'security', title: 'Two-Factor Auth', icon: Shield, required: false },
]

export default function UnifiedCreateAccountPage() {
  const router = useRouter()
  const { magic } = useMagicContext()
  const [register, { loading }] = useRegisterMutation()
  const [email, setEmail] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false)
  const [accountCreated, setAccountCreated] = useState<boolean>(false)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basics']))
  const { setTopNavBarProps, setIsAuthLayout, setHideBottomNavBar } = useLayoutContext()

  // Refs for scrolling
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    setTopNavBarProps({})
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const markSectionComplete = (sectionId: string) => {
    setCompletedSections(prev => new Set(prev).add(sectionId))
    // Auto-expand next section
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1]
      setExpandedSections(prev => new Set(prev).add(nextSection.id))
      // Scroll to next section
      setTimeout(() => {
        sectionRefs.current[nextSection.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: { token, ...values } } })
      setJwt(data?.register.jwt)
      setAccountCreated(true)
      markSectionComplete('basics')
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0])
      setErrors(formatted)
    }
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
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="retro-text text-cyan-400">Loading...</div>
      </div>
    )
  }

  const completedCount = completedSections.size
  const totalSections = sections.length

  return (
    <>
      <SEO
        title="Create Account | SoundChain"
        canonicalUrl="/create-account/unified"
        description="Create your SoundChain account - Web3 Music Platform"
      />
      <div className="min-h-screen bg-[#0a0a0a] py-6 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="retro-title text-2xl md:text-3xl mb-2">Create Your Account</h1>
            <p className="retro-json text-sm">Join the future of music ownership</p>
          </div>

          {/* Progress Bar */}
          <Card className="retro-card mb-6 sticky top-4 z-10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="retro-text text-sm text-white">Setup Progress</span>
                <Badge className="bg-cyan-500/20 text-cyan-400">
                  {completedCount}/{totalSections} Complete
                </Badge>
              </div>
              <div className="flex gap-1">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      completedSections.has(section.id)
                        ? 'bg-gradient-to-r from-cyan-400 to-green-400'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, index) => {
              const Icon = section.icon
              const isCompleted = completedSections.has(section.id)
              const isExpanded = expandedSections.has(section.id)
              const isDisabled = section.id !== 'basics' && !accountCreated

              return (
                <Card
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  className={`retro-card transition-all duration-300 ${
                    isCompleted ? 'border-green-500/50' : ''
                  } ${isDisabled ? 'opacity-50' : ''}`}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => !isDisabled && toggleSection(section.id)}
                    disabled={isDisabled}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <h3 className="retro-text text-white font-semibold">{section.title}</h3>
                        <span className="text-xs text-gray-500">
                          {section.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Done</Badge>
                      )}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </button>

                  {/* Section Content */}
                  {isExpanded && !isDisabled && (
                    <CardContent className="p-4 pt-0 border-t border-gray-800">
                      {section.id === 'basics' && !accountCreated && (
                        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                          {(formikProps) => (
                            <Form className="space-y-6" autoComplete="off">
                              <div className="space-y-4">
                                <div>
                                  <label className="metadata-label text-xs mb-2 block">Display Name</label>
                                  <input
                                    type="text"
                                    name="displayName"
                                    placeholder="Your name"
                                    value={formikProps.values.displayName}
                                    onChange={formikProps.handleChange}
                                    onBlur={formikProps.handleBlur}
                                    className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none retro-text"
                                  />
                                  {formikProps.touched.displayName && formikProps.errors.displayName && (
                                    <p className="text-red-400 text-xs mt-1">{formikProps.errors.displayName}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="metadata-label text-xs mb-2 block">
                                    Username (max {HANDLE_MAX_CHARS} chars, letters & numbers only)
                                  </label>
                                  <input
                                    type="text"
                                    name="handle"
                                    placeholder="username"
                                    maxLength={HANDLE_MAX_CHARS}
                                    value={formikProps.values.handle}
                                    onChange={formikProps.handleChange}
                                    onBlur={formikProps.handleBlur}
                                    className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none retro-text"
                                  />
                                  {formikProps.touched.handle && formikProps.errors.handle && (
                                    <p className="text-red-400 text-xs mt-1">{formikProps.errors.handle}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                                <input
                                  type="checkbox"
                                  id="termsCheckbox"
                                  checked={termsAccepted}
                                  onChange={toggleTerms}
                                  className="mt-1 h-4 w-4 rounded border-cyan-500 bg-black text-cyan-500 focus:ring-0"
                                />
                                <label htmlFor="termsCheckbox" className="text-xs text-gray-400">
                                  I agree to SoundChain's{' '}
                                  <Link href="/terms-and-conditions" className="text-cyan-400 hover:underline">
                                    Terms & Conditions
                                  </Link>{' '}
                                  and{' '}
                                  <Link href="/privacy-policy" className="text-cyan-400 hover:underline">
                                    Privacy Policy
                                  </Link>
                                </label>
                              </div>

                              <Button
                                type="submit"
                                disabled={loading || !termsAccepted}
                                className={`w-full retro-button py-3 ${
                                  termsAccepted
                                    ? 'bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400'
                                    : 'bg-gray-700 cursor-not-allowed'
                                }`}
                              >
                                {loading ? 'Creating...' : 'Create Account'}
                              </Button>
                            </Form>
                          )}
                        </Formik>
                      )}

                      {section.id === 'basics' && accountCreated && (
                        <div className="text-center py-4">
                          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                          <p className="retro-text text-green-400">Account Created!</p>
                        </div>
                      )}

                      {section.id === 'profile-picture' && accountCreated && (
                        <div className="py-4">
                          <ProfilePictureForm
                            afterSubmit={() => markSectionComplete('profile-picture')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-cyan-500 to-blue-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('profile-picture')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'cover-picture' && accountCreated && (
                        <div className="py-4">
                          <CoverPictureForm
                            afterSubmit={() => markSectionComplete('cover-picture')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-cyan-500 to-blue-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('cover-picture')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'genres' && accountCreated && (
                        <div className="py-4">
                          <FavoriteGenresForm
                            afterSubmit={() => markSectionComplete('genres')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-purple-500 to-pink-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('genres')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'musician-type' && accountCreated && (
                        <div className="py-4">
                          <MusicianTypesForm
                            afterSubmit={() => markSectionComplete('musician-type')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-orange-500 to-yellow-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('musician-type')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'bio' && accountCreated && (
                        <div className="py-4">
                          <BioForm
                            afterSubmit={() => markSectionComplete('bio')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-green-500 to-teal-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('bio')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'social-links' && accountCreated && (
                        <div className="py-4">
                          <SocialLinksForm
                            afterSubmit={() => markSectionComplete('social-links')}
                            submitText="Save & Continue"
                            submitProps={{ className: 'w-full retro-button bg-gradient-to-r from-blue-500 to-indigo-500' }}
                          />
                          <button
                            onClick={() => markSectionComplete('social-links')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}

                      {section.id === 'security' && accountCreated && (
                        <div className="py-4">
                          <p className="text-gray-400 text-sm mb-4">
                            Protect your account with two-factor authentication (recommended)
                          </p>
                          <SecurityForm afterSubmit={() => markSectionComplete('security')} />
                          <button
                            onClick={() => markSectionComplete('security')}
                            className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm"
                          >
                            Skip for now →
                          </button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Final CTA */}
          {accountCreated && (
            <Card className="retro-card mt-6 bg-gradient-to-r from-cyan-500/10 to-green-500/10 border-cyan-500/50">
              <CardContent className="p-6 text-center">
                <h3 className="retro-title text-lg mb-2">Ready to Explore?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  You can always update your profile later in settings
                </p>
                <Button
                  onClick={handleFinalSubmit}
                  className="w-full retro-button bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 py-3 text-lg font-bold"
                >
                  Enter SoundChain →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center mt-8 text-gray-600 text-xs">
            <p>© 2025 SoundChain. Web3 Music Platform.</p>
          </div>
        </div>
      </div>
    </>
  )
}
