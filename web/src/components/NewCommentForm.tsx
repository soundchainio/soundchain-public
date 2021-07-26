import { ErrorMessage, Field, Form, Formik, FormikHelpers, FormikProps } from 'formik';
import * as yup from 'yup';
import { useAddCommentMutation } from '../lib/graphql';

export interface NewCommentFormProps {
  postId: string;
  authorId: string;
}

interface FormValues {
  body: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

const initialValues: FormValues = { body: '' };

export const NewCommentForm = ({ postId, authorId }: NewCommentFormProps) => {
  const [addComment] = useAddCommentMutation();

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { postId: 'asdfasdgasdg', authorId, body } } });
    resetForm();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting }: FormikProps<FormValues>) => (
        <Form>
          <div>
            <Field as="textarea" name="body" />
            <ErrorMessage name="body" component="div" />
          </div>
          <button type="submit" disabled={isSubmitting} className="p-2 border-2">
            Post comment
          </button>
        </Form>
      )}
    </Formik>
  );
};
