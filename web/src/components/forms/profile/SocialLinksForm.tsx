import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Form, Formik, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateSocialMediasMutation } from 'lib/graphql'
import * as yup from 'yup'

// Extended interface to include all fields until schema is updated
interface ExtendedSocialMedias {
  __typename?: 'SocialMedias' | undefined
  soundcloud?: string | null
  spotify?: string | null
  bandcamp?: string | null
  facebook?: string | null
  instagram?: string | null
  x?: string | null
  tiktok?: string | null
  linktree?: string | null
  discord?: string | null
  telegram?: string | null
  onlyfans?: string | null
  customLink?: string | null
}

// Fallback with all properties
const getSocialMedias = (socialMedias: any): ExtendedSocialMedias => ({
  ...{ soundcloud: '', spotify: '', bandcamp: '', facebook: '', instagram: '', x: '', tiktok: '', linktree: '', discord: '', telegram: '', onlyfans: '', customLink: '' },
  ...socialMedias,
})

interface SocialLinksFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

// Music-related at top, others below, onlyfans second-to-last, customLink last
interface FormValues {
  soundcloud: string | undefined
  spotify: string | undefined
  bandcamp: string | undefined
  facebook: string | undefined
  instagram: string | undefined
  x: string | undefined
  tiktok: string | undefined
  linktree: string | undefined
  discord: string | undefined
  telegram: string | undefined
  onlyfans: string | undefined
  customLink: string | undefined
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  soundcloud: yup.string().label('Soundcloud').required('Soundcloud is required'),
  spotify: yup.string().label('Spotify').required('Spotify is required'),
  bandcamp: yup.string().label('Bandcamp').required('Bandcamp is required'),
  facebook: yup.string().label('Facebook').required('Facebook is required'),
  instagram: yup.string().label('Instagram').required('Instagram is required'),
  x: yup.string().label('X').required('X is required'),
  tiktok: yup.string().label('TikTok').required('TikTok is required'),
  linktree: yup.string().label('Linktree').required('Linktree is required'),
  discord: yup.string().label('Discord').required('Discord is required'),
  telegram: yup.string().label('Telegram').required('Telegram is required'),
  onlyfans: yup.string().label('OnlyFans').required('OnlyFans is required'),
  customLink: yup.string().label('Custom Link').required('Custom Link is required'),
})

const regex = /(?:^https?:\/\/(?:www\.)?[\w]+\.(com|ee|gg|me|org))\/([\w-]+)/
const normalize = (value: string, platform?: string) => {
  const match = value.match(regex)
  if (match) {
    return match[1]
  }
  return value.replace(/[^a-zA-Z0-9-_.#/=?]/g, '')
}

export const SocialLinksForm = ({ afterSubmit, submitText, submitProps }: SocialLinksFormProps) => {
  const me = useMe()
  const socialMedias = getSocialMedias(me?.profile?.socialMedias)
  const initialFormValues: FormValues = {
    soundcloud: socialMedias.soundcloud || '',
    spotify: socialMedias.spotify || '',
    bandcamp: socialMedias.bandcamp || '',
    facebook: socialMedias.facebook || '',
    instagram: socialMedias.instagram || '',
    x: socialMedias.x || '', // Removed twitter fallback
    tiktok: socialMedias.tiktok || '',
    linktree: socialMedias.linktree || '',
    discord: socialMedias.discord || '',
    telegram: socialMedias.telegram || '',
    onlyfans: socialMedias.onlyfans || '',
    customLink: socialMedias.customLink || '',
  }
  const [updateSocialMedias, { loading }] = useUpdateSocialMediasMutation()

  const handleSubmit = async ({
    soundcloud,
    spotify,
    bandcamp,
    facebook,
    instagram,
    x,
    tiktok,
    linktree,
    discord,
    telegram,
    onlyfans,
    customLink,
  }: FormValues) => {
    await updateSocialMedias({
      variables: {
        input: {
          socialMedias: { soundcloud, spotify, bandcamp, facebook, instagram, x, tiktok, linktree, discord, telegram, onlyfans, customLink } as any, // Temporary cast
        },
      },
    })
    afterSubmit()
  }
  if (!me) return null

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ setFieldValue }: FormikProps<FormValues>) => (
        <Form className="social-links flex flex-1 flex-col space-y-6">
          <div className="flex items-center">
            <InputField
              label="soundcloud.com/"
              type="text"
              name="soundcloud"
              onChange={e => setFieldValue('soundcloud', normalize(e.target.value, 'soundcloud'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="open.spotify.com/artist/"
              type="text"
              name="spotify"
              onChange={e => setFieldValue('spotify', normalize(e.target.value, 'spotify'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="bandcamp.com/"
              type="text"
              name="bandcamp"
              onChange={e => setFieldValue('bandcamp', normalize(e.target.value, 'bandcamp'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="facebook.com/"
              type="text"
              name="facebook"
              onChange={e => setFieldValue('facebook', normalize(e.target.value, 'facebook'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="instagram.com/"
              type="text"
              name="instagram"
              onChange={e => setFieldValue('instagram', normalize(e.target.value, 'instagram'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="x.com/"
              type="text"
              name="x"
              onChange={e => setFieldValue('x', normalize(e.target.value, 'x'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="tiktok.com/"
              type="text"
              name="tiktok"
              onChange={e => setFieldValue('tiktok', normalize(e.target.value, 'tiktok'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="linktr.ee/"
              type="text"
              name="linktree"
              onChange={e => setFieldValue('linktree', normalize(e.target.value, 'linktree'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="discord.gg/"
              type="text"
              name="discord"
              onChange={e => setFieldValue('discord', normalize(e.target.value, 'discord'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="t.me/"
              type="text"
              name="telegram"
              onChange={e => setFieldValue('telegram', normalize(e.target.value, 'telegram'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="onlyfans.com/"
              type="text"
              name="onlyfans"
              onChange={e => setFieldValue('onlyfans', normalize(e.target.value, 'onlyfans'))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="Custom Link"
              type="text"
              name="customLink"
              onChange={e => setFieldValue('customLink', e.target.value)} // No normalization for custom
            />
          </div>
          <div className="flex flex-col">
            <Button type="submit" disabled={loading} variant="outline" className="h-12" {...submitProps}>
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
