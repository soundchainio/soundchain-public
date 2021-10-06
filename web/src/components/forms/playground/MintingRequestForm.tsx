import { AssetUploadField } from 'components/AssetUploadField';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { mintNftToken } from 'lib/blockchain';
import { usePinJsonToIpfsMutation, usePinToIpfsMutation } from 'lib/graphql';
import React, { useState } from 'react';
import { Metadata } from 'types/NftTypes';
import Web3 from 'web3';
import * as yup from 'yup';

interface Props {
  to: string;
  web3: Web3;
  afterSubmit: () => void;
}

interface FormValues {
  to: string;
  name: string;
  description: string;
  assetUrl: string;
  artUrl?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  to: yup.string().required(),
  name: yup.string().required(),
  description: yup.string().required(),
  assetUrl: yup.string().required(),
  artUrl: yup.string(),
});

export const MintingRequestForm = ({ to, web3, afterSubmit }: Props) => {
  const [pinToIPFS] = usePinToIpfsMutation();
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation();
  const [requesting, setRequesting] = useState(false);

  const initialValues: FormValues = {
    to: to,
    name: '',
    assetUrl: '',
    description: '',
  };

  const handleSubmit = async (
    { name, assetUrl, artUrl, to, description }: FormValues,
    { resetForm }: FormikHelpers<FormValues>,
  ) => {
    setRequesting(true);

    const assetKey = assetUrl.substring(assetUrl.lastIndexOf('/') + 1);
    const { data: assetPinResult } = await pinToIPFS({
      variables: {
        input: {
          fileKey: assetKey,
          fileName: name,
        },
      },
    });

    const metadata: Metadata = {
      description,
      name,
      asset: `ipfs://${assetPinResult?.pinToIPFS.cid}`,
    };

    if (artUrl) {
      const artPin = assetUrl.substring(assetUrl.lastIndexOf('/') + 1);
      const { data: artPinResult } = await pinToIPFS({
        variables: {
          input: {
            fileKey: artPin,
            fileName: `${name}-art`,
          },
        },
      });
      metadata.art = `ipfs://${artPinResult?.pinToIPFS.cid}`;
    }

    const { data: metadataPinResult } = await pinJsonToIPFS({
      variables: {
        input: {
          fileName: `${name}-metadata`,
          json: metadata,
        },
      },
    });

    console.log(metadata);
    console.log(metadataPinResult?.pinJsonToIPFS.cid);

    const mintResult = await mintNftToken(web3, `ipfs://${metadataPinResult?.pinJsonToIPFS.cid}`, to, to);

    if (mintResult) {
      afterSubmit();
      resetForm();
    }

    setRequesting(false);
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
              <InputField label={'Target wallet'} name="to" type="text" />
            </div>
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
