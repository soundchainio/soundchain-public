import { Button } from 'components/Button';
import { ImageUploadField } from 'components/ImageUploadField';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Form, Formik, FormikProps } from 'formik';
import { useCreateTrackMutation } from 'lib/graphql';
import React from 'react';
import * as yup from 'yup';

interface Props {
  afterSubmit: () => void;
}

interface FormValues {
  title: string;
  audioUrl: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().required(),
  audioUrl: yup.string().required(),
});

const initialValues: FormValues = {
  title: '',
  audioUrl: '',
};

export const TrackForm = ({ afterSubmit }: Props) => {
  const [createTrack] = useCreateTrackMutation({ refetchQueries: ['Tracks'] });

  const handleSubmit = async (values: FormValues) => {
    await createTrack({ variables: { input: values } });
    afterSubmit();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ values }: FormikProps<FormValues>) => (
        <Form className="flex flex-col justify-between h-full">
          <div>
            <ImageUploadField name="audioUrl">Upload Audio File</ImageUploadField>
            {values.audioUrl.length > 0 && (
              <div className="mt-6">
                <Label>TRACK TITLE</Label>
                <InputField name="title" type="text" />
              </div>
            )}
          </div>
          <Button type="submit" variant="outline" borderColor="bg-green-gradient h-12">
            MINT NFT AUDIO
          </Button>
        </Form>
      )}
    </Formik>
  );
};
