import classNames from 'classnames';
import { Button, ButtonProps } from 'components/Button';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateCoverPictureMutation } from 'lib/graphql';
import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import * as yup from 'yup';

interface CoverPictureFormProps {
  afterSubmit: () => void;
  submitProps?: ButtonProps;
  submitText: string;
}

interface FormValues {
  coverPicture?: string | undefined;
}

const defaultCoverPictures = [
  '/default-pictures/cover/birds.jpeg',
  '/default-pictures/cover/cells.jpeg',
  '/default-pictures/cover/fog.jpeg',
  '/default-pictures/cover/net.jpeg',
  '/default-pictures/cover/rings.jpeg',
  '/default-pictures/cover/waves.jpeg',
];

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  coverPicture: yup.string(),
});

export const CoverPictureForm = ({ afterSubmit, submitText, submitProps }: CoverPictureFormProps) => {
  const me = useMe();
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null);
  const [updateCoverPicture] = useUpdateCoverPictureMutation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const picture = me?.profile.coverPicture;

    if (picture && defaultCoverPictures.includes(picture)) {
      setDefaultPicture(picture);
    }
  }, [me?.profile.coverPicture]);

  const onUpload = useCallback(uploading => {
    setLoading(uploading);
  }, []);

  if (!me) return null;

  const initialFormValues: FormValues = {
    coverPicture: '',
  };

  const onSubmit = async ({ coverPicture }: FormValues) => {
    await updateCoverPicture({
      variables: {
        input: {
          coverPicture: coverPicture || defaultPicture,
        },
      },
    });

    afterSubmit();
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { coverPicture } }) => (
        <Form className="flex flex-1 flex-col">
          <div className="flex-grow space-y-8">
            <div className="flex flex-col">
              <Label textSize="base">CUSTOM COVER PHOTO:</Label>
              <ImageUploadField
                name="coverPicture"
                onUpload={onUpload}
                className={`${loading || coverPicture ? 'h-[150px]' : ''} cursor-pointer mt-8`}
              >
                Upload Cover Photo
              </ImageUploadField>
            </div>
            <div className="flex flex-col space-y-8">
              <Label textSize="base">DEFAULT COVER PHOTOS:</Label>
              <div className="flex flex-col space-y-4">
                {defaultCoverPictures.map(picture => (
                  <div
                    key={picture}
                    className={classNames(
                      'relative flex justify-center justify-self-center rounded-full w-full h-[150px] p-2 cursor-pointer',
                      defaultPicture === picture && 'rounded-xl border-2',
                    )}
                    onClick={() => setDefaultPicture(picture)}
                  >
                    <div className="relative flex w-full h-full">
                      <Image
                        alt="Default cover picture"
                        src={picture}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <Button type="submit" disabled={loading} variant="outline" className="h-12 mt-4" {...submitProps}>
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
