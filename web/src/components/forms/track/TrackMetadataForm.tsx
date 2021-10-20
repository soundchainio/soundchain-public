import { Button } from 'components/Button';
import { ImageUpload } from 'components/ImageUpload';
import { InputField } from 'components/InputField';
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

export interface InitialValues extends Omit<Partial<FormValues>, 'artworkUrl'> {
  artworkFile?: File;
}

interface Props {
  initialValues?: InitialValues;
  handleSubmit: (values: FormValues) => void;
}

export const TrackMetadataForm = ({ initialValues, handleSubmit }: Props) => {
  const { web3, balance } = useMagicContext();
  const [maxGasFee, setMaxGasFee] = useState<string>();
  const [enoughFunds, setEnoughFunds] = useState<boolean>();
  const [uploadingArt, setUploadingArt] = useState<boolean>();

  const defaultValues: FormValues = {
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    artist: initialValues?.artist || '',
    album: initialValues?.album || '',
    releaseYear: initialValues?.releaseYear || new Date().getFullYear(),
    genres: initialValues?.genres || [],
    artworkUrl: '',
  };

  useEffect(() => {
    const gasCheck = () => {
      if (web3) {
        getMaxGasFee(web3).then(setMaxGasFee);
      }
    };
    gasCheck();
    const interval = setInterval(() => {
      gasCheck();
    }, 5 * 1000);
    return () => clearInterval(interval);
  }, [web3]);

  const onArtworkUpload = (val: string, setFieldValue: (field: string, value: string) => void) => {
    setFieldValue('artworkUrl', val);
  };

  useEffect(() => {
    if (balance && maxGasFee) {
      setEnoughFunds(balance > maxGasFee);
    }
  }, [maxGasFee, balance]);

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue }) => (
        <Form className="flex flex-col gap-4 h-full">
          <div className="flex items-center px-4">
            <div className="h-30 w-30 mr-2 flex flex-col items-center">
              <ImageUpload
                artwork={true}
                onChange={val => onArtworkUpload(val, setFieldValue)}
                onUpload={setUploadingArt}
                initialValue={initialValues?.artworkFile}
              />
              <span className="text-gray-80 underline text-xs mt-2 font-bold">
                {uploadingArt ? 'UPLOADING...' : 'CHANGE ARTWORK'}
              </span>
            </div>
            <div className="flex flex-col flex-1 gap-2">
              <InputField name="title" type="text" label="TRACK TITLE" />
              <InputField name="artist" type="text" label="ARTIST" />
            </div>
          </div>
          <div className="px-4">
            <TextareaField rows={3} name="description" label="DESCRIPTION" />
          </div>
          <div className="px-4">
            <InputField name="album" type="text" label="ALBUM" />
          </div>
          <div className="px-4">
            <InputField name="releaseYear" type="number" label="RELEASE YEAR" />
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
            <div className="flex-1">
              {enoughFunds && !uploadingArt && (
                <Button type="submit" variant="rainbow">
                  MINT NFT
                </Button>
              )}
              {uploadingArt && (
                <div className="flex-1">
                  <div className="text-white text-right text-sm font-bold">Uploading artwork...</div>
                </div>
              )}
              {!enoughFunds && (
                <div className="text-white text-right text-sm font-bold">
                  {`It seems like you might have not enough funds `}
                  <span className="whitespace-nowrap">:(</span>
                </div>
              )}
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};
