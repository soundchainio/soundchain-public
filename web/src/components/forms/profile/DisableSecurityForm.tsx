import React from 'react'
import { Form, Formik } from 'formik'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { useUpdateOtpMutation, useValidateOtpRecoveryPhraseMutation } from 'lib/graphql'
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { updateOTPCache } from 'lib/apollo/cache/updateOTPCache'

interface Props {
  afterSubmit: () => void
}

interface FormValues {
  recoveryPhrase: string
}

const initialValues: FormValues = {
  recoveryPhrase: '',
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  recoveryPhrase: yup.string().required('Recovery Phrase is required'),
})

export const DisableRecoveryForm = ({ afterSubmit }: Props) => {
  const [updateOTP, { loading }] = useUpdateOtpMutation()
  const [validateOtpRecoveryPhrase] = useValidateOtpRecoveryPhraseMutation()

  const handleSubmit = async (values: FormValues) => {
    const { recoveryPhrase } = values
    const isRecoveryPhraseValid = await validateOtpRecoveryPhrase({
      variables: { input: { otpRecoveryPhrase: recoveryPhrase } },
    })

    if (!isRecoveryPhraseValid.data?.validateOTPRecoveryPhrase) {
      toast.error('Invalid recovery phrase')
      return
    }

    await updateOTP({
      variables: { input: { otpSecret: '', otpRecoveryPhrase: '' } },
      update: updateOTPCache,
    })

    afterSubmit()
  }

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col">
        <div className="flex-grow">
          <p className="text-gray-80">Enter your Recovery Phrase to disable the Two-Factor</p>
          <InputField type="text" name="recoveryPhrase" label="Recovery Phrase" />
        </div>
        <Button
          type="submit"
          disabled={loading}
          variant="outline"
          className="mt-4 h-12 w-full"
          borderColor="bg-pink-gradient"
        >
          DISABLE
        </Button>
      </Form>
    </Formik>
  )
}
