import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { useMe } from 'hooks/useMe';
import { Send } from 'icons/Send';
import { animateScroll as scroll } from 'react-scroll';
import * as yup from 'yup';
import { SendMessageMutation, useSendMessageMutation } from '../lib/graphql';
import { Avatar } from './Avatar';
import { FlexareaField } from './FlexareaField';

const messageMaxLength = 160;

export interface NewMessageFormProps {
  profileId: string;
  onNewMessage: (message: SendMessageMutation) => void;
}

interface FormValues {
  body: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(messageMaxLength),
});

const initialValues: FormValues = { body: '' };

export const NewMessageForm = ({ profileId, onNewMessage }: NewMessageFormProps) => {
  const [sendMessage] = useSendMessageMutation({
    onCompleted: data => onNewMessage(data),
  });
  const me = useMe();

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await sendMessage({ variables: { input: { message: body, toId: profileId } } });
    resetForm();
    scroll.scrollToBottom({ duration: 500, smooth: 'easeInOutCubic' });
  };

  return (
    <div className="fixed bottom-20 right-0 left-0 z-20">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting, isValid, dirty }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex flex-row items-start space-x-3 p-3 py-5 bg-gray-25">
              {me && <Avatar className="flex self-center" profile={me.profile} linkToProfile={false} />}
              <FlexareaField
                name="body"
                id="newMessageInput"
                placeholder="Write a message..."
                maxLength={messageMaxLength}
              />
              <button type="submit" disabled={isSubmitting} className="pt-1">
                <Send color={dirty && isValid ? 'green-blue' : undefined} />
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
