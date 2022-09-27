import { Button } from 'components/OldButtons/Button'
import { InputField } from 'components/InputField'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Form, Formik } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useUpdateProfileDisplayNameMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import * as yup from 'yup'

interface FormValues {
  displayName: string | undefined
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  displayName: yup.string().min(3).max(255).required().label('Name'),
})

const topNavBarProps: TopNavBarProps = {
  title: 'Name',
}

export default function NamePage() {
  const me = useMe()
  const router = useRouter()
  const initialFormValues: FormValues = { displayName: me?.profile?.displayName }
  const [updateDisplayName, { loading }] = useUpdateProfileDisplayNameMutation()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  const onSubmit = async ({ displayName }: FormValues) => {
    await updateDisplayName({ variables: { input: { displayName: displayName as string } } })
    router.push('/settings')
  }

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setHideBottomNavBar(true)

    return () => {
      setHideBottomNavBar(false)
    }
  }, [setHideBottomNavBar, setTopNavBarProps])

  if (!me) return null

  return (
    <>
      <SEO title="Edit Name | SoundChain" canonicalUrl="/settings/name/" description="SoundChain Edit Name" />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <InputField
                label="First or full name"
                type="text"
                name="displayName"
                placeholder="Name"
                maxLength={255}
              />
            </div>
            <p className="flex-grow text-gray-50"> This will be displayed publically to other users. </p>
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
        </Formik>
      </div>
    </>
  )
}
