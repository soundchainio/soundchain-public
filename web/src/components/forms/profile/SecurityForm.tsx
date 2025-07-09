import * as bip39 from 'bip39'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateOtpMutation } from 'lib/graphql'
import React, { useState } from 'react'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { authenticator } from 'otplib'
import { ScanCodeForm } from './two-factor/ScanCodeForm'
import { ValidateCodeForm } from './two-factor/ValidateCodeForm'
import { RecoveryPhraseForm } from './two-factor/RecoveryPhraseForm'
import { ValidateRecoveryPhraseForm } from './two-factor/ValidateRecoveryPhraseForm'
import { updateOTPCache } from 'lib/apollo/cache/updateOTPCache'

interface SecurityFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
}

interface FormValues {
  token?: string
  secret: string
  recoveryPhrase: string
  recoveryPhraseInput?: string
}

const validationSchema: Array<yup.AnySchema> = [
  yup.object(),
  yup.object().shape({
    token: yup.string().required('6-digit code is required'),
    secret: yup.string().required(),
  }),
  yup.object(),
  yup.object().shape({
    recoveryPhrase: yup.string().required(),
    recoveryPhraseInput: yup.string().required('Recovery Phrase is required'),
  }),
]

const steps = ['Scan Code', 'Validate code', 'Recovery Phrase', 'Validate Recovery Phrase']

export const SecurityForm = ({ afterSubmit }: SecurityFormProps) => {
  const [updateOTP, { loading }] = useUpdateOtpMutation()
  const [activeStep, setActiveStep] = useState(0)
  const isLastStep = activeStep === steps.length - 1
  const me = useMe()

  const recoveryPhrase = bip39.generateMnemonic()
  const secret = authenticator.generateSecret()

  if (!me) return null

  const handleSubmit = (values: FormValues) => {
    switch (activeStep) {
      case 1: {
        const { token = '', secret } = values
        const isValid = authenticator.verify({ token, secret })
        if (!isValid) {
          toast.error('Invalid code')
          return
        }
        setActiveStep(activeStep + 1)
        return
      }
      case 3: {
        const { recoveryPhraseInput = '', recoveryPhrase } = values
        if (recoveryPhraseInput !== recoveryPhrase) {
          toast.error('Invalid recovery phrase')
          return
        }
        submitForm(values)
        return
      }
      case 0:
      case 2:
      default:
        setActiveStep(activeStep + 1)
    }
  }

  const handleBack = () => setActiveStep(activeStep - 1)

  const submitForm = async ({ secret, recoveryPhrase }: FormValues) => {
    await updateOTP({
      variables: { input: { otpSecret: secret, otpRecoveryPhrase: recoveryPhrase } },
      update: updateOTPCache,
    })

    afterSubmit()
  }

  const initialFormValues: FormValues = {
    secret,
    recoveryPhrase,
    token: '',
    recoveryPhraseInput: '',
  }

  const renderForm = (step: number) => {
    switch (step) {
      case 0:
        return <ScanCodeForm />
      case 1:
        return <ValidateCodeForm />
      case 2:
        return <RecoveryPhraseForm />
      case 3:
        return <ValidateRecoveryPhraseForm />
      default:
        return null
    }
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema[activeStep]} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
        {renderForm(activeStep)}

        <div className="flex justify-between gap-8">
          {activeStep > 0 && activeStep < steps.length - 1 && (
            <Button variant="outline" onClick={handleBack} className="mt-4 h-12 w-full" borderColor="bg-pink-gradient">
              BACK
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            variant="outline"
            className="mt-4 h-12 w-full"
            borderColor={`bg-${isLastStep ? 'green' : 'blue'}-gradient`}
          >
            {isLastStep ? 'SAVE' : 'NEXT'}
          </Button>
        </div>
      </Form>
    </Formik>
  )
}
