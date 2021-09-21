import { DefaultProfilePictureField } from 'components/DefaultProfilePictureField';
import { ImageUploadField } from 'components/ImageUploadField';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { DefaultProfilePicture, useUpdateProfilePictureMutation } from 'lib/graphql';
import { FormAction } from 'types/FormAction';
import * as yup from 'yup';
import { Button } from './Button';
import { Label } from './Label';

interface ProfilePictureFormValues {
  profilePicture?: string | undefined;
  defaultProfilePicture: DefaultProfilePicture;
}

const validationSchema: yup.SchemaOf<ProfilePictureFormValues> = yup.object().shape({
  profilePicture: yup.string(),
  defaultProfilePicture: yup.mixed<DefaultProfilePicture>().oneOf(Object.values(DefaultProfilePicture)).required(),
});

interface ProfilePictureFormProps {
  action: FormAction;
  afterSubmit: () => void;
}

export const ProfilePictureForm = ({ action, afterSubmit }: ProfilePictureFormProps) => {
  const me = useMe();
  const [updateProfilePicture, { loading }] = useUpdateProfilePictureMutation();

  if (!me) return null;

  const initialFormValues: ProfilePictureFormValues = {
    profilePicture: '',
    defaultProfilePicture: me.profile.defaultProfilePicture,
  };

  const isNew = action === FormAction.NEW;

  const onSubmit = async (values: ProfilePictureFormValues) => {
    await updateProfilePicture({
      variables: {
        input: { ...values },
      },
    });

    afterSubmit();
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      <Form className="flex flex-1 flex-col">
        <div className="flex-grow space-y-8">
          <div className="flex flex-col">
            <Label textSize="base">Custom Profile Photo:</Label>
            <ImageUploadField name="profilePicture" className="mt-8" rounded>
              Upload Profile Photo
            </ImageUploadField>
          </div>
          <div className="flex flex-col space-y-8">
            <Label textSize="base">Default Profile Photos:</Label>
            <DefaultProfilePictureField />
          </div>
        </div>
        <div className="flex flex-col">
          <Button
            type="submit"
            disabled={loading}
            variant="outline"
            borderColor={isNew ? 'bg-blue-gradient' : 'bg-green-gradient'}
            className="h-12"
          >
            {isNew ? 'NEXT' : 'SAVE'}
          </Button>
        </div>
      </Form>
    </Formik>
  );
};
