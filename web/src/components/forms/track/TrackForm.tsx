import { AssetUploadField } from 'components/AssetUploadField';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { useCreateTrackMutation } from 'lib/graphql';
import React, { useState } from 'react';
import * as yup from 'yup';

interface Props {
  to: string;
  afterSubmit: () => void;
}

interface FormValues {
  name: string;
  description: string;
  assetUrl: string;
  artUrl?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  name: yup.string().required(),
  description: yup.string().required(),
  assetUrl: yup.string().required(),
  artUrl: yup.string(),
});

const initialValues: FormValues = {
  name: '',
  assetUrl: '',
  description: '',
};

export const TrackForm = ({ to, afterSubmit }: Props) => {
  const [createTrack] = useCreateTrackMutation();
  const [requesting, setRequesting] = useState(false);

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    setRequesting(true);
    await createTrack({ variables: { input: { to: to, ...values } } });
    setRequesting(false);
    afterSubmit();
    resetForm();
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values }: FormikProps<FormValues>) => (
        <Form className="flex flex-col justify-between h-full">
          <div>
            <div className="mt-6">
              <InputField label={'Name'} name="name" type="text" />
            </div>
            <div className="mt-6">
              <TextareaField label={'Description'} name="description" />
            </div>
            <AssetUploadField name="assetUrl">Upload Asset File</AssetUploadField>
            {values.assetUrl && (
              <a target="_blank" href={values.assetUrl} rel="noreferrer">
                {values.assetUrl}
              </a>
            )}
            <AssetUploadField name="artUrl">Upload Art File</AssetUploadField>
            {values.artUrl && (
              <a target="_blank" href={values.artUrl} rel="noreferrer">
                {values.artUrl}
              </a>
            )}
          </div>
          <Button type="submit" variant="rainbow" className="mt-6">
            {requesting ? 'Requesting...' : 'Mint NFT'}
          </Button>
        </Form>
      )}
    </Formik>
  );
};
