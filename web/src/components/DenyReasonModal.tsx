import { Dialog } from "@reach/dialog";
import { Button } from 'components/Button';
import { Delete as DeleteButton } from 'components/Buttons/Delete';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { ProfileVerificationRequestsDocument, useUpdateProfileVerificationRequestMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import { ManageRequestTab } from 'types/ManageRequestTabType';
import * as yup from 'yup';

interface DenyReasonModalProps {
  requestId: string
  showReason: boolean
  setShowReason: (val: boolean) => void
}

interface FormValues {
  reason?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  reason: yup.string(),
});

export const DenyReasonModal = ({ requestId, showReason, setShowReason }: DenyReasonModalProps) => {
  const [updateRequestVerification] = useUpdateProfileVerificationRequestMutation({ fetchPolicy: 'network-only', refetchQueries: [ProfileVerificationRequestsDocument] });
  const router = useRouter();
  const me = useMe();

  const close = () => setShowReason(false);

  const handleSubmit = async (values: FormValues) => {
    await updateRequestVerification({
      variables: {
        id: requestId,
        input: {
          reviewerProfileId: me?.profile.id,
          status: ManageRequestTab.DENIED,
          reason: values.reason
        }
      }
    });
    router.push('/manage-requests');
  };

  return (
    <Dialog
      isOpen={showReason}
      onDismiss={close}
      className="w-80 bg-gray-20"
    >
      <Formik initialValues={{ reason: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <TextareaField label="Reason" name="reason" />
          <DeleteButton
            type="submit"
            className="h-12 w-full mt-5 text-white text-sm"
          >
            DENY
          </DeleteButton>
          <Button
            variant="outline"
            className="h-12 mt-5 w-full"
            onClick={close}
          >
            CANCEL
          </Button>
        </Form>
      </Formik>
    </Dialog>
  );
}