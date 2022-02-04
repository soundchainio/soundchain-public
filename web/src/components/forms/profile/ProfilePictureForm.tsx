import classNames from 'classnames';
import { ImageUploadField } from 'components/ImageUploadField';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfilePictureMutation } from 'lib/graphql';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import * as yup from 'yup';
import { Button, ButtonProps } from '../../Button';
import { Label } from '../../Label';

interface FormValues {
  profilePicture?: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  profilePicture: yup.string(),
});

interface ProfilePictureFormProps {
  afterSubmit: () => void;
  submitProps?: ButtonProps;
  submitText: string;
}

const defaultProfilePictures = [
  '/default-pictures/profile/red.png',
  '/default-pictures/profile/orange.png',
  '/default-pictures/profile/yellow.png',
  '/default-pictures/profile/green.png',
  '/default-pictures/profile/teal.png',
  '/default-pictures/profile/blue.png',
  '/default-pictures/profile/purple.png',
  '/default-pictures/profile/pink.png',
];

export const ProfilePictureForm = ({ afterSubmit, submitText, submitProps }: ProfilePictureFormProps) => {
  const me = useMe();
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null);
  const [updateProfilePicture] = useUpdateProfilePictureMutation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const picture = me?.profile.profilePicture;

    if (picture && defaultProfilePictures.includes(picture)) {
      setDefaultPicture(picture);
    }
  }, [me?.profile.profilePicture]);

  const onUpload = useCallback(uploading => {
    setLoading(uploading);
  }, []);

  if (!me) return null;

  const initialFormValues: FormValues = {
    profilePicture: '',
  };

  const onSubmit = async ({ profilePicture }: FormValues) => {
    await updateProfilePicture({
      variables: {
        input: {
          profilePicture: profilePicture || defaultPicture,
        },
      },
    });

    afterSubmit();
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { profilePicture } }) => (
        <Form className="flex flex-1 flex-col">
          <div className="flex-grow space-y-8">
            <div className="flex flex-col">
              <Label textSize="base">Custom Profile Photo:</Label>
              {loading && !profilePicture ? (
                <ImageUploadField name="profilePicture" className="mt-8">
                  Uploading
                </ImageUploadField>
              ) : (
                <ImageUploadField
                  name="profilePicture"
                  className={`${loading || profilePicture ? 'self-center w-24 h-24' : ''} cursor-pointer mt-8`}
                  onUpload={onUpload}
                  rounded="rounded-full"
                >
                  Upload Profile Photo
                </ImageUploadField>
              )}
            </div>
            <div className="flex flex-col space-y-8">
              <Label textSize="base">Default Profile Photos:</Label>
              <div className="grid grid-cols-4 gap-4">
                {defaultProfilePictures.map(picture => (
                  <button
                    key={picture}
                    className={classNames(
                      'flex justify-center justify-self-center rounded-full w-[60px] h-[60px]',
                      defaultPicture === picture && 'ring-4 ring-white',
                    )}
                    onClick={() => setDefaultPicture(picture)}
                  >
                    <Image alt="Default profile picture" src={picture} width={60} height={60} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <Button type="submit" disabled={loading} variant="outline" className="h-12" {...submitProps}>
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
