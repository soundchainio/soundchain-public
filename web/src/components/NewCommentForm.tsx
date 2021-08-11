import { Field, FieldProps, Form, Formik, FormikHelpers, FormikProps } from 'formik';
import TextareaAutosize from 'react-textarea-autosize';
import * as yup from 'yup';
import { CommentsDocument, CommentsQuery, useAddCommentMutation } from '../lib/graphql';

export interface NewCommentFormProps {
  postId: string;
}

interface FormValues {
  body: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

const initialValues: FormValues = { body: '' };

export const NewCommentForm = ({ postId }: NewCommentFormProps) => {
  const [addComment] = useAddCommentMutation({
    update(cache, { data }) {
      const newComment = data?.addComment.comment;
      const existingComments = cache.readQuery<CommentsQuery>({ query: CommentsDocument, variables: { postId } });
      cache.writeQuery({
        query: CommentsDocument,
        variables: { postId },
        data: {
          comments: [newComment, ...(existingComments?.comments || [])],
        },
      });
    },
  });

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { post: postId, body } } });
    resetForm();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting }: FormikProps<FormValues>) => (
        <Form>
          <div className="flex flex-row">
            <Field name="body">{({ field }: FieldProps) => <TextareaAutosize {...field} />}</Field>
            <button type="submit" disabled={isSubmitting} className="p-2 border-2">
              Post comment
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
