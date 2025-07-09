import { useEffect } from 'react'

import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Form, Formik, FormikHelpers } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useUpdateProfileBioMutation } from 'lib/graphql' // Updated to correct mutation
import { useRouter } from 'next/router'
import * as yup from 'yup'

const topNavBarProps: TopNavBarProps = {
  title: 'Update Name',
}

interface FormValues {
  displayName: string
}

export default function NamePage() {
  const me = useMe()
  const [updateProfile] = useUpdateProfileBioMutation()
  const router = useRouter()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  if (!me) return null

  const initialFormValues: FormValues = {
    displayName: me.profile.displayName || '',
  }

  const validationSchema = yup.object().shape({
    displayName: yup.string().min(3).max(255).required('Name is required'),
  })

  const onSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    try {
      await updateProfile({
        variables: { input: { displayName: values.displayName } },
      })
      router.push('/settings')
    } catch (error) {
      console.error('Update profile error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SEO title="Update Name | SoundChain" canonicalUrl="/settings/name" description="Update your name on SoundChain" />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          {({ values, handleChange, ...formikProps }) => (
            <Form className="flex flex-1 flex-col space-y-6" {...(formikProps as any)}>
              <div>
                <InputField
                  label="First or full name"
                  type="text"
                  name="displayName"
                  value={values.displayName}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" className="w-full">
                Save
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </>
  )
}
