import classNames from 'classnames';
import { Button } from 'components/Button';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateCoverPictureMutation } from 'lib/graphql';
import { sample } from 'lodash';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { FormAction } from 'types/FormAction';
import * as yup from 'yup';

interface CoverPictureFormProps {
  action: FormAction;
  afterSubmit: () => void;
}

interface CoverPictureFormValues {
  coverPicture?: string | undefined;
}

const validationSchema: yup.SchemaOf<CoverPictureFormValues> = yup.object().shape({
  coverPicture: yup.string(),
});

const defaultPictures = [
  '/default-pictures/cover/birds.jpeg',
  '/default-pictures/cover/cells.jpeg',
  '/default-pictures/cover/fog.jpeg',
  '/default-pictures/cover/net.jpeg',
  '/default-pictures/cover/rings.jpeg',
  '/default-pictures/cover/waves.jpeg',
];

export const CoverPictureForm = ({ action, afterSubmit }: CoverPictureFormProps) => {
  const me = useMe();
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null);
  const [updateCoverPicture, { loading }] = useUpdateCoverPictureMutation();

  useEffect(() => {
    const picture = me?.profile.coverPicture;

    if (picture && defaultPictures.includes(picture)) {
      setDefaultPicture(picture);
    }
  }, [me?.profile.coverPicture]);

  if (!me) return null;

  const initialFormValues: CoverPictureFormValues = {
    coverPicture: '',
  };

  const isNew = action === FormAction.NEW;

  const onSubmit = async ({ coverPicture }: CoverPictureFormValues) => {
    await updateCoverPicture({
      variables: {
        input: {
          coverPicture: coverPicture || defaultPicture || sample(defaultPictures),
        },
      },
    });

    afterSubmit();
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
            <div className="flex flex-col space-y-4">
              {defaultPictures.map(picture => (
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
          <Button
            type="submit"
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
