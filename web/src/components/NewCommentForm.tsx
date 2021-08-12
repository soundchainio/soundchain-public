import { ApolloCache, FetchResult } from '@apollo/client';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { Send } from 'icons/Send';
import * as yup from 'yup';
import {
  AddCommentMutation,
  CommentsDocument,
  CommentsQuery,
  PostDocument,
  PostQuery,
  useAddCommentMutation,
} from '../lib/graphql';
import { Avatar } from './Avatar';
import { FlexareaField } from './FlexareaField';

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
    update: (cache, result) => updateCache(cache, result, postId),
  });

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { postId, body } } });
    resetForm();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty }: FormikProps<FormValues>) => (
        <Form>
          <div className="flex flex-row items-start space-x-3 p-3 bg-gray-25">
            <Avatar />
            <FlexareaField name="body" placeholder="Write a comment..." />
            <button type="submit" disabled={isSubmitting} className="pt-1">
              <Send activated={dirty && isValid} />
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

function updateCache(cache: ApolloCache<AddCommentMutation>, { data }: FetchResult, postId: string) {
  const newComment = data?.addComment.comment;
  const existingComments = cache.readQuery<CommentsQuery>({ query: CommentsDocument, variables: { postId } });
  cache.writeQuery({
    query: CommentsDocument,
    variables: { postId },
    data: {
      comments: [newComment, ...(existingComments?.comments || [])],
    },
  });

  const commentPost = cache.readQuery<PostQuery>({ query: PostDocument, variables: { id: postId } });
  if (!commentPost) return;

  cache.modify({
    id: cache.identify(commentPost.post),
    fields: {
      commentCount: cachedCount => cachedCount + 1,
    },
  });
}
