import { useModalState } from 'contexts/providers/modal';
import { Form, Formik, FormikHelpers } from 'formik';
import { UpdateCommentInput, useUpdateCommentMutation } from 'lib/graphql';
import * as yup from 'yup';
import { Button } from './Button';
import { PostBodyField } from './PostBodyField';

interface InitialValues {
  body: UpdateCommentInput['body'];
}

interface CommentFormProps {
  initialValues: InitialValues;
  afterSubmit: () => void;
  onCancel: (setFieldValue: (field: string, value: string) => void) => void;
}

export interface FormValues {
  body: UpdateCommentInput['body'];
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

const defaultInitialValues = { body: '' };

export const CommentForm = ({ afterSubmit, initialValues, onCancel }: CommentFormProps) => {
  const { editCommentId } = useModalState();
  const [updateComment] = useUpdateCommentMutation();

  const onSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (!editCommentId) {
      resetForm();
      afterSubmit();
      return;
    }

    await updateComment({
      variables: { input: { body: values.body, commentId: editCommentId } },
    });

    resetForm();
    afterSubmit();
  };

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues || defaultInitialValues}
      validationSchema={postSchema}
      onSubmit={onSubmit}
    >
      {({ setFieldValue, isValid }) => (
        <Form className="flex flex-col h-full">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={() => onCancel(setFieldValue)}>
              Cancel
            </div>
            <div className="flex-1 text-center text-white font-bold">Edit Comment</div>
            <div className="flex-1 text-center m-2">
              <div className="ml-6">
                <Button className="bg-gray-30 text-sm " type="submit" disabled={!isValid} variant="rainbow-rounded">
                  Save
                </Button>
              </div>
            </div>
          </div>
          <PostBodyField name="body" placeholder="What's happening?" maxLength={160} />
        </Form>
      )}
    </Formik>
  );
};
