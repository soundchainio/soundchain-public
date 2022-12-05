import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Form, Formik, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateSocialMediasMutation } from 'lib/graphql'
import * as yup from 'yup'

interface SocialLinksFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

//linktree discord telegram Spotify Bandcamp
interface FormValues {
  facebook: string | undefined
  instagram: string | undefined
  twitter: string | undefined
  soundcloud: string | undefined
  linktree: string | undefined
  discord: string | undefined
  telegram: string | undefined
  spotify: string | undefined
  bandcamp: string | undefined
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  facebook: yup.string().label('Facebook'),
  instagram: yup.string().label('Instagram'),
  twitter: yup.string().label('Twitter'),
  soundcloud: yup.string().label('Soundcloud'),
  linktree: yup.string().label('Linktree'),
  discord: yup.string().label('Discord'),
  telegram: yup.string().label('Telegram'),
  spotify: yup.string().label('Spotify'),
  bandcamp: yup.string().label('Bandcamp'),
})

const regex = /(?:^https?:\/\/(?:www\.)?[\w]+\.com)\/([\w-]+)/
const normalize = (value: string) => {
  const match = value.match(regex)
  if (match) {
    return match[1]
  }

  return value.replace(/[^a-zA-Z0-9-_.#/]/g, '')
}

export const SocialLinksForm = ({ afterSubmit, submitText, submitProps }: SocialLinksFormProps) => {
  const me = useMe()
  const initialFormValues: FormValues = {
    facebook: me?.profile?.socialMedias.facebook || '',
    instagram: me?.profile?.socialMedias.instagram || '',
    twitter: me?.profile?.socialMedias.twitter || '',
    soundcloud: me?.profile?.socialMedias.soundcloud || '',
    linktree: me?.profile?.socialMedias.linktree || '',
    discord: me?.profile?.socialMedias.discord || '',
    telegram: me?.profile?.socialMedias.telegram || '',
    spotify: me?.profile?.socialMedias.spotify || '',
    bandcamp: me?.profile?.socialMedias.bandcamp || '',
  }
  const [updateSocialMedias, { loading }] = useUpdateSocialMediasMutation()

  const handleSubmit = async ({
    facebook,
    instagram,
    twitter,
    soundcloud,
    linktree,
    discord,
    telegram,
    spotify,
    bandcamp,
  }: FormValues) => {
    await updateSocialMedias({
      variables: {
        input: {
          socialMedias: { facebook, instagram, twitter, soundcloud, linktree, discord, telegram, spotify, bandcamp },
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
              label="facebook.com/"
              type="text"
              name="facebook"
              onChange={e => setFieldValue('facebook', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="instagram.com/"
              type="text"
              name="instagram"
              onChange={e => setFieldValue('instagram', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="twitter.com/"
              type="text"
              name="twitter"
              onChange={e => setFieldValue('twitter', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="soundcloud.com/"
              type="text"
              name="soundcloud"
              onChange={e => setFieldValue('soundcloud', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="linktr.ee/"
              type="text"
              name="linktree"
              onChange={e => setFieldValue('linktree', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="discord.gg/"
              type="text"
              name="discord"
              onChange={e => setFieldValue('discord', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="t.me/"
              type="text"
              name="telegram"
              onChange={e => setFieldValue('telegram', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="open.spotify.com/"
              type="text"
              name="spotify"
              onChange={e => setFieldValue('spotify', normalize(e.target.value))}
            />
          </div>
          <div className="flex items-center">
            <InputField
              label="bandcamp.com/"
              type="text"
              name="bandcamp"
              onChange={e => setFieldValue('bandcamp', normalize(e.target.value))}
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
