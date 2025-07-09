/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Form, Formik, FormikHelpers } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useUpdateHandleMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import { HANDLE_MAX_CHARS } from 'pages/create-account'
import React, { useEffect } from 'react'
import { formatValidationErrors } from 'utils/errorHelpers'
import { handleRegex } from 'utils/Validation'
import * as yup from 'yup'

interface FormValues {
  handle: string | undefined
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  handle: yup
    .string()
    .min(1)
    .max(HANDLE_MAX_CHARS)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required()
    .label('Username'),
})

const topNavBarProps: TopNavBarProps = {
  title: 'Username',
}

export default function SettingsUsernamePage() {
  const me = useMe()
  const router = useRouter()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  const initialFormValues: FormValues = { handle: me?.handle }
  const [updateHandle, { loading }] = useUpdateHandleMutation()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setHideBottomNavBar(true)

    return () => {
      setHideBottomNavBar(false)
    }
  }, [setHideBottomNavBar, setTopNavBarProps])

  const onSubmit = async ({ handle }: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      await updateHandle({ variables: { input: { handle: handle as string } } })
      router.push('/settings')
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0])
      setErrors(formatted)
    }
  }

  if (!me) return null

  return (
    <>
      <SEO
        title="Name Settings | SoundChain"
        canonicalUrl="/settings/username/"
        description="SoundChain Name Settings"
      />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          {({ values, handleChange, ...formikProps }) => (
            <Form className="flex flex-1 flex-col space-y-6" {...(formikProps as any)}>
              <div>
                <InputField
                  label="Username"
                  type="text"
                  name="handle"
                  placeholder="Username"
                  maxLength={HANDLE_MAX_CHARS}
                />
              </div>
              <p className="flex-grow text-gray-50">
                Usernames can only have letters and numbers and can be a max of {HANDLE_MAX_CHARS} characters.
              </p>
              <div className="flex flex-col">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="outline"
                  borderColor="bg-green-gradient"
                  className="h-12"
                >
                  SAVE
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </>
  )
}
