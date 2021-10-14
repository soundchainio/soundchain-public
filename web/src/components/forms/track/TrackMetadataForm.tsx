import { Button } from 'components/Button';
import { ImageUpload } from 'components/ImageUpload';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { TextareaField } from 'components/TextareaField';
import { Form, Formik } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { getMaxGasFee } from 'lib/blockchain';
import { Genre } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

export interface FormValues {
  title: string;
  description: string;
  artist?: string;
  album?: string;
  releaseYear?: number;
  genres?: Genre[];
  artworkUrl?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().required(),
  description: yup.string().required(),
  artist: yup.string(),
  album: yup.string(),
  releaseYear: yup.number(),
  genres: yup.array(),
  artworkUrl: yup.string(),
});

interface Props {
  initialValues?: FormValues;
  handleSubmit: (values: FormValues) => void;
  setCoverPhotoUrl?: (val: string) => void;
}

const defaultValues: FormValues = {
  title: '',
  description: '',
  artist: '',
  album: '',
  releaseYear: 0,
  genres: [],
  artworkUrl: '',
};

export const TrackMetadataForm = ({ initialValues = defaultValues, handleSubmit, setCoverPhotoUrl }: Props) => {
  const { web3, balance } = useMagicContext();
  const [maxGasFee, setMaxGasFee] = useState<string>();
  const [enoughFunds, setEnoughFunds] = useState<boolean>();

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

  useEffect(() => {
    if (balance && maxGasFee) {
      setEnoughFunds(balance > maxGasFee);
    }
  }, [maxGasFee, balance]);

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue }) => (
        <Form className="flex flex-col gap-4 h-full">
          <div className="flex items-center px-4">
            <div className="h-30 w-30 mr-2 flex flex-col items-center">
              <ImageUpload artwork={true} onChange={val => onArtworkUpload(val, setFieldValue)} />
              <span className="text-gray-80 underline text-xs mt-2 font-bold">CHANGE ARTWORK</span>
            </div>
            <div className="flex-1">
              <Label className="font-bold">TRACK TITLE</Label>
              <InputField name="title" type="text" />
              <Label className="font-bold">ARTIST</Label>
              <InputField name="artist" type="text" />
            </div>
          </div>
          <div className="px-4">
            <Label className="font-bold">DESCRIPTION</Label>
            <TextareaField rows={3} name="description" />
          </div>
          <div className="px-4">
            <Label className="font-bold">ALBUM</Label>
            <InputField name="album" type="text" />
          </div>
          <div className="px-4">
            <Label className="font-bold">RELEASE YEAR</Label>
            <InputField name="releaseYear" type="number" />
          </div>
          <div className="flex items-center justify-between py-3 px-4 mt-4" style={{ backgroundColor: '#202020' }}>
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
          <div className="pl-4 pr-4 pb-4 flex items-center mt-4">
            <div className="flex-1 font-black text-xs" style={{ color: '#808080' }}>
              <div>Max gas fee</div>
              <div className="flex items-center gap-1">
                <Matic />
                <div className="text-white">{maxGasFee}</div>MATIC
              </div>
            </div>
            {enoughFunds && (
              <div className="flex-1">
                <Button type="submit" variant="rainbow" disabled={!enoughFunds}>
                  MINT NFT
                </Button>
              </div>
            )}
            {!enoughFunds && (
              <div className="text-white text-center text-sm font-bold">{`It seems like you might have not enough funds :(`}</div>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
};
