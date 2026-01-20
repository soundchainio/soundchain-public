import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateProfileDisplayNameMutation } from 'lib/graphql'
import * as yup from 'yup'

interface DisplayNameFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

interface FormValues {
  displayName: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  displayName: yup
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be at most 255 characters')
    .required()
    .label('Name'),
})

export const DisplayNameForm = ({ afterSubmit, submitText, submitProps }: DisplayNameFormProps) => {
  const me = useMe()
  const initialFormValues: FormValues = { displayName: me?.profile?.displayName || '' }
  const [updateDisplayName, { loading }] = useUpdateProfileDisplayNameMutation()

  const handleSubmit = async ({ displayName }: FormValues) => {
    await updateDisplayName({ variables: { input: { displayName } } })
    afterSubmit()
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col space-y-6">
        <div>
          <InputField
            label="Display Name"
            name="displayName"
            type="text"
            placeholder="Enter your display name..."
          />
          <p className="mt-2 text-sm text-gray-400">
            This is the name that appears on your profile and posts.
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
