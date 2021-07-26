import { gql, useMutation } from '@apollo/client';
import { ErrorMessage, Field, Form, Formik, FormikHelpers, FormikProps } from 'formik';
import * as yup from 'yup';
import apolloClient from '../lib/apolloClient';

export interface NewCommentFormProps {
  postId: string;
  authorId: string;
}

interface FormValues {
  body: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(255),
});

const initialValues: FormValues = { body: '' };

const ADD_COMMENT = gql`
  mutation AddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      comment {
        id
      }
    }
  }
`;

export const NewCommentForm = ({ postId, authorId }: NewCommentFormProps) => {
  const [addComment, { error, data }] = useMutation(ADD_COMMENT, { client: apolloClient });

  const handleSubmit = async ({ body }: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { postId: 'asdfasdgasdg', authorId, body } } });
    setSubmitting(false);
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting }: FormikProps<FormValues>) => (
        <Form>
          <div>
            <Field type="textarea" name="body" />
            <ErrorMessage name="body" component="div" />
          </div>
          <button type="submit" disabled={isSubmitting}>
            Post comment
          </button>
        </Form>
      )}
    </Formik>
  );
};
