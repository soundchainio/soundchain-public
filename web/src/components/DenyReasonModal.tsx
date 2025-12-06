import { Dialog } from '@reach/dialog'
import { Button } from 'components/common/Buttons/Button'
import { Delete as DeleteButton } from 'components/common/Buttons/Delete'
import { TextareaField } from 'components/TextareaField'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { ProfileVerificationRequestsDocument, ProfileVerificationStatusType, useUpdateProfileVerificationRequestMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import * as yup from 'yup'

interface DenyReasonModalProps {
  requestId: string
  showReason: boolean
  setShowReason: (val: boolean) => void
}

interface FormValues {
  reason: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  reason: yup.string().required(),
})

export const DenyReasonModal = ({ requestId, showReason, setShowReason }: DenyReasonModalProps) => {
  const [updateRequestVerification] = useUpdateProfileVerificationRequestMutation({
    fetchPolicy: 'network-only',
    refetchQueries: [ProfileVerificationRequestsDocument],
  })
  const router = useRouter()
  const me = useMe()

  const close = () => setShowReason(false)

  const handleSubmit = async (values: FormValues) => {
    await updateRequestVerification({
      variables: {
        id: requestId,
        input: {
          reviewerProfileId: me?.profile.id,
          status: ProfileVerificationStatusType.Denied,
          reason: values.reason,
        },
      },
    })
    router.push('/manage-requests')
  }

  return (
    <Dialog isOpen={showReason} onDismiss={close} className="w-80 bg-gray-20" aria-label="Deny">
      <Formik initialValues={{ reason: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <TextareaField label="Reason" name="reason" />
          <DeleteButton type="submit" className="mt-5 h-12 w-full text-sm text-white">
            DENY
          </DeleteButton>
          <Button variant="outline" className="mt-5 h-12 w-full" onClick={close}>
            CANCEL
          </Button>
        </Form>
      </Formik>
    </Dialog>
  )
}
