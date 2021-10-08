import { Button } from 'components/Button';
import { ImageUpload } from 'components/ImageUpload';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik } from 'formik';
import React from 'react';
import * as yup from 'yup';

interface Props {
  afterSubmit: () => void;
  setCoverPhotoUrl?: (val: string) => void;
  assetUrl: string;
}

interface FormValues {
  title: string;
  description?: string;
  artworkUrl?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().required(),
  description: yup.string(),
  artworkUrl: yup.string(),
});

const initialValues: FormValues = {
  title: '',
  description: '',
  artworkUrl: '',
};

export const TrackMetadataForm = ({ afterSubmit, setCoverPhotoUrl }: Props) => {
  // const [addMetadata] = useAddTrackMetadataMutation({ refetchQueries: ['Tracks'] });

  const handleSubmit = (values: FormValues) => {
    console.log(values);
    afterSubmit();
  };

  const onArtworkUpload = (val: string, setFieldValue: (field: string, value: string) => void) => {
    if (setCoverPhotoUrl) {
      setCoverPhotoUrl(val);
      setFieldValue('artworkUrl', val);
    }
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ setFieldValue }) => (
        <Form className="flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center mt-6">
              <div className="h-30 w-30 mr-2 flex flex-col items-center">
                <ImageUpload artwork={true} onChange={val => onArtworkUpload(val, setFieldValue)} />
                <span className="text-gray-80 underline text-xs mt-2">CHANGE ARTWORK</span>
              </div>
              <div className="flex-1">
                <Label>TRACK TITLE</Label>
                <InputField name="title" type="text" />
              </div>
            </div>
            <div>
              <div className="mt-4">
                <Label>DESCRIPTION</Label>
                <TextareaField name="description" />
              </div>
            </div>
          </div>
          <Button type="submit" variant="outline" borderColor="bg-green-gradient h-12">
            MINT NFT AUDIO
          </Button>
        </Form>
      )}
    </Formik>
  );
};
