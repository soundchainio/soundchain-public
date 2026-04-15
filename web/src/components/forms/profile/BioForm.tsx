import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { getBodyCharacterCount } from 'components/Post/PostModal'
import { TextareaField } from 'components/TextareaField'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useState } from 'react'
import * as yup from 'yup'

interface BioFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

interface FormValues {
  bio: string // Changed from string | undefined to required string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  bio: yup.string().label('Bio').required(), // Added .required() to match FormValues
})

const maxBioLength = 1000 // Updated from 120 to 1000

const setMaxInputLength = (input: string) => {
  const rawValue = input.length
  return maxBioLength + (rawValue - getBodyCharacterCount(input))
}

export const BioForm = ({ afterSubmit, submitText, submitProps }: BioFormProps) => {
  const me = useMe()
  const initialFormValues: FormValues = { bio: me?.profile?.bio || '' }
  const [loading, setLoading] = useState(false)

  const handleSubmit = async ({ bio }: FormValues) => {
    setLoading(true)
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { bio } }),
      })
      afterSubmit()
    } finally { setLoading(false) }
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ values }) => (
        <Form className="flex flex-1 flex-col space-y-6">
          <div>
            <TextareaField
              label="Bio"
              name="bio"
              placeholder="Add a bio..."
              maxLength={setMaxInputLength(values.bio || '')}
            />
          </div>
          <p className="flex-grow text-right text-gray-50">
            {`${getBodyCharacterCount(values.bio || '')} / ${maxBioLength}`}
          </p>
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
