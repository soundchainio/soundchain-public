import { Button } from 'components/Button';
import { ImageUpload } from 'components/ImageUpload';
import { InputField } from 'components/InputField';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { getMaxGasFee } from 'lib/blockchain';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

interface Props {
  handleSubmit: (values: FormValues) => void;
  setCoverPhotoUrl?: (val: string) => void;
}

export interface FormValues {
  title: string;
  description: string;
  artworkUrl?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().required(),
  description: yup.string().required(),
  artworkUrl: yup.string(),
});

const initialValues: FormValues = {
  title: '',
  description: '',
  artworkUrl: '',
};

export const TrackMetadataForm = ({ handleSubmit, setCoverPhotoUrl }: Props) => {
  const { web3, balance } = useMagicContext();
  const [maxGasFee, setMaxGasFee] = useState<string>();
  useEffect(() => {
    if (web3) {
      getMaxGasFee(web3).then(setMaxGasFee);
    }
  }, [web3]);

  const onArtworkUpload = (val: string, setFieldValue: (field: string, value: string) => void) => {
    setFieldValue('artworkUrl', val);
    if (setCoverPhotoUrl) {
      setCoverPhotoUrl(val);
    }
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ setFieldValue }) => (
        <Form className="flex flex-col gap-4 h-full">
          <div className="px-4">
            <div className="flex items-center">
              <div className="h-30 w-30 mr-2 flex flex-col items-center">
                <ImageUpload artwork={true} onChange={val => onArtworkUpload(val, setFieldValue)} />
                <span className="text-gray-80 underline text-xs mt-2 font-bold">CHANGE ARTWORK</span>
              </div>
              <div className="flex-1">
                <InputField label="TRACK TITLE" name="title" type="text" />
              </div>
            </div>
            <div>
              <div className="mt-4">
                <TextareaField label="DESCRIPTION" rows={3} name="description" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 px-4" style={{ backgroundColor: '#202020' }}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold">
                <Logo id="soundchain-wallet" height="20" width="20" /> SoundChain Wallet
              </div>
              <div className="flex items-center gap-2 font-black text-xs" style={{ color: '#808080' }}>
                Balance: <Matic />
                <div className="text-white">{balance}</div>MATIC
              </div>
            </div>
            <div className="text-white text-xs text-right">
              Need some test Matic? <br />
              <a
                className="text-xs font-bold"
                href="https://faucet.polygon.technology/"
                target="_blank"
                rel="noreferrer"
              >
                Get some here
              </a>
            </div>
          </div>
          <div className="pl-4 pr-4 pb-4 flex items-center">
            <div className="flex-1 font-black text-xs" style={{ color: '#808080' }}>
              <div>Max gas fee</div>
              <div className="flex items-center gap-1">
                <Matic />
                <div className="text-white">{maxGasFee}</div>MATIC
              </div>
            </div>
            <div className="flex-1">
              <Button type="submit" variant="rainbow">
                MINT NFT
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};
