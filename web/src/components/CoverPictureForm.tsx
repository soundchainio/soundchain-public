import { Button } from 'components/Button';
import { DefaultCoverPictureField } from 'components/DefaultCoverPictureField';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { DefaultCoverPicture, useUpdateCoverPictureMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';
import { FormAction } from 'types/FormAction';
import * as yup from 'yup';

interface CoverPictureFormProps {
  action: FormAction;
}

interface CoverPictureFormValues {
  coverPicture?: string | undefined;
  defaultCoverPicture: DefaultCoverPicture;
}

const validationSchema: yup.SchemaOf<CoverPictureFormValues> = yup.object().shape({
  coverPicture: yup.string(),
  defaultCoverPicture: yup.mixed<DefaultCoverPicture>().oneOf(Object.values(DefaultCoverPicture)).required(),
});

export const CoverPictureForm = ({ action }: CoverPictureFormProps) => {
  const me = useMe();
  const [updateCoverPicture, { loading }] = useUpdateCoverPictureMutation();
  const router = useRouter();

  if (!me) return null;

  const initialFormValues: CoverPictureFormValues = {
    coverPicture: '',
    defaultCoverPicture: me.profile.defaultCoverPicture,
  };

  const isNew = action === FormAction.NEW;

  const onSubmit = async (values: CoverPictureFormValues) => {
    await updateCoverPicture({
      variables: {
        input: { ...values },
      },
    });

    if (isNew) {
      router.push('/create-account/favorite-genres');
    } else {
      router.back();
    }
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      <Form className="flex flex-1 flex-col">
        <div className="flex-grow space-y-8">
          <div className="flex flex-col">
            <Label textSize="base">CUSTOM COVER PHOTO:</Label>
            <ImageUploadField name="coverPicture" className="mt-8">
              Upload Cover Photo
            </ImageUploadField>
          </div>
          <div className="flex flex-col space-y-8">
            <Label textSize="base">DEFAULT COVER PHOTOS:</Label>
            <DefaultCoverPictureField />
          </div>
        </div>
        <div className="flex flex-col">
          <Button
            type="submit"
            loading={loading ? true : undefined}
            disabled={loading}
            variant="outline"
            borderColor={isNew ? 'bg-blue-gradient' : 'bg-green-gradient'}
            className="h-12 mt-4"
          >
            {isNew ? 'NEXT' : 'SAVE'}
          </Button>
        </div>
      </Form>
    </Formik>
  );
};
