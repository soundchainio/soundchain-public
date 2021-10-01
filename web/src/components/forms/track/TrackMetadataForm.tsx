import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik } from 'formik';
import { useAddTrackMetadataMutation } from 'lib/graphql';
import React from 'react';
import * as yup from 'yup';

interface Props {
  trackId: string;
  afterSubmit: () => void;
}

interface FormValues {
  title: string;
  description?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().required(),
  description: yup.string(),
});

const initialValues: FormValues = {
  title: '',
  description: '',
};

export const TrackMetadataForm = ({ trackId, afterSubmit }: Props) => {
  const [addMetadata] = useAddTrackMetadataMutation();

  const handleSubmit = async (values: FormValues) => {
    await addMetadata({ variables: { input: { trackId, ...values } } });
    afterSubmit();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-col justify-between h-full">
        <div>
          <div className="mt-6">
            <Label>TRACK TITLE</Label>
            <InputField name="title" type="text" />
          </div>
          <div className="mt-6">
            <Label>Description</Label>
            <TextareaField name="description" />
          </div>
        </div>
        <Button type="submit" variant="outline" borderColor="bg-green-gradient h-12">
          MINT NFT AUDIO
        </Button>
      </Form>
    </Formik>
  );
};
