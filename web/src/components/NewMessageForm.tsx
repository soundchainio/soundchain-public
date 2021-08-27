import { ApolloCache, FetchResult } from '@apollo/client';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { useMe } from 'hooks/useMe';
import { Send } from 'icons/Send';
import { animateScroll } from 'react-scroll';
import * as yup from 'yup';
import { ConversationDocument, ConversationQuery, SendMessageMutation, useSendMessageMutation } from '../lib/graphql';
import { Avatar } from './Avatar';
import { FlexareaField } from './FlexareaField';

export interface NewMessageFormProps {
  profileId: string;
}

interface FormValues {
  body: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

const initialValues: FormValues = { body: '' };

export const NewMessageForm = ({ profileId }: NewMessageFormProps) => {
  const [sendMessage] = useSendMessageMutation({
    update: (cache, result) => updateCache(cache, result, profileId),
  });
  const me = useMe();

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await sendMessage({ variables: { input: { message: body, to: profileId } } });
    resetForm();
    animateScroll.scrollToBottom({ duration: 200 });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty }: FormikProps<FormValues>) => (
        <Form>
          <div className="flex flex-row items-start space-x-3 p-3 bg-gray-25">
            <Avatar src={me?.profile.profilePicture} />
            <FlexareaField name="body" placeholder="Write a comment..." />
            <button type="submit" disabled={isSubmitting} className="pt-1">
              <Send activatedColor={dirty && isValid ? 'green-blue' : undefined} />
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

function updateCache(cache: ApolloCache<SendMessageMutation>, { data }: FetchResult, profileId: string) {
  const newMessage = data?.sendMessage.message;
  const existingMessages = cache.readQuery<ConversationQuery>({
    query: ConversationDocument,
    variables: { profileId },
  });
  cache.writeQuery({
    query: ConversationDocument,
    variables: { profileId },
    data: {
      conversation: {
        nodes: [...(existingMessages?.conversation.nodes || []), newMessage],
      },
    },
  });
}
