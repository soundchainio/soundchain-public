import { Button, ButtonProps } from 'components/Button'
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

interface FormValues {
  facebook: string | undefined
  instagram: string | undefined
  twitter: string | undefined
  soundcloud: string | undefined
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  facebook: yup.string().label('Facebook'),
  instagram: yup.string().label('Instagram'),
  twitter: yup.string().label('Twitter'),
  soundcloud: yup.string().label('Soundcloud'),
})

const regex = /(?:^https?:\/\/(?:www\.)?[\w]+\.com)\/([\w-]+)/
const normalize = (value: string) => {
  const match = value.match(regex)
  if (match) {
    return match[1]
  }

  return value.replace(/[^a-zA-Z0-9-_.]/g, '')
}

export const SocialLinksForm = ({ afterSubmit, submitText, submitProps }: SocialLinksFormProps) => {
  const me = useMe()
  const initialFormValues: FormValues = {
    facebook: me?.profile?.socialMedias.facebook || '',
    instagram: me?.profile?.socialMedias.instagram || '',
    twitter: me?.profile?.socialMedias.twitter || '',
    soundcloud: me?.profile?.socialMedias.soundcloud || '',
  }
  const [updateSocialMedias, { loading }] = useUpdateSocialMediasMutation()

  const handleSubmit = async ({ facebook, instagram, twitter, soundcloud }: FormValues) => {
    await updateSocialMedias({ variables: { input: { socialMedias: { facebook, instagram, twitter, soundcloud } } } })
    afterSubmit()
  }

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
