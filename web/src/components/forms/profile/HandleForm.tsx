import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateHandleMutation } from 'lib/graphql'
import { handleRegex } from 'utils/Validation'
import * as yup from 'yup'

interface HandleFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

interface FormValues {
  handle: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  handle: yup
    .string()
    .min(1, 'Username must be at least 1 character')
    .max(24, 'Username must be at most 24 characters')
    .matches(handleRegex, 'Username can only contain letters, numbers, underscores, hyphens, and periods')
    .required()
    .label('Username'),
})

export const HandleForm = ({ afterSubmit, submitText, submitProps }: HandleFormProps) => {
  const me = useMe()
  const initialFormValues: FormValues = { handle: me?.handle || '' }
  const [updateHandle, { loading }] = useUpdateHandleMutation()

  const handleSubmit = async ({ handle }: FormValues) => {
    await updateHandle({ variables: { input: { handle } } })
    afterSubmit()
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col space-y-6">
        <div>
          <InputField
            label="Username"
            name="handle"
            type="text"
            placeholder="Enter your username..."
          />
          <p className="mt-2 text-sm text-gray-400">
            Your username appears in your profile URL: soundchain.io/dex/users/<span className="text-cyan-400">username</span>
          </p>
        </div>
        <div className="flex flex-col">
          <Button type="submit" disabled={loading} variant="outline" className="h-12" {...submitProps}>
            {submitText}
          </Button>
        </div>
      </Form>
    </Formik>
  )
}
