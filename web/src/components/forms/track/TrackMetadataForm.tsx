import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { ImageUpload } from 'components/ImageUpload';
import { InputField } from 'components/InputField';
import { Matic } from 'components/Matic';
import { TextareaField } from 'components/TextareaField';
import { WalletSelector } from 'components/WalletSelector';
import { Form, Formik } from 'formik';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useWalletContext } from 'hooks/useWalletContext';
import { Genre } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { GenreLabel, genres } from 'utils/Genres';
import * as yup from 'yup';

export interface FormValues {
  title: string;
  description: string;
  artist?: string;
  album?: string;
  copyright?: string;
  releaseYear?: number;
  genres?: Genre[];
  artworkUrl?: string;
  royalty: number;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  title: yup.string().max(100).required(),
  description: yup.string().max(500).required(),
  artist: yup.string(),
  album: yup.string().max(100),
  copyright: yup.string().max(100),
  releaseYear: yup.number(),
  genres: yup.array(),
  artworkUrl: yup.string(),
  royalty: yup.number().integer().min(0).max(100).required(),
});

export interface InitialValues extends Omit<Partial<FormValues>, 'artworkUrl'> {
  artworkFile?: File;
}

interface Props {
  initialValues?: InitialValues;
  handleSubmit: (values: FormValues) => void;
}

export const TrackMetadataForm = ({ initialValues, handleSubmit }: Props) => {
  const { balance } = useWalletContext();
  const maxGasFee = useMaxGasFee();
  const [enoughFunds, setEnoughFunds] = useState<boolean>();
  const [uploadingArt, setUploadingArt] = useState<boolean>();

  const defaultValues: FormValues = {
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    artist: initialValues?.artist || '',
    album: initialValues?.album || '',
    copyright: initialValues?.copyright || '',
    releaseYear: initialValues?.releaseYear || new Date().getFullYear(),
    genres: initialValues?.genres || [],
    artworkUrl: '',
    royalty: 0,
  };

  const onArtworkUpload = (val: string, setFieldValue: (field: string, value: string) => void) => {
    setFieldValue('artworkUrl', val);
  };

  const handleGenreClick = (
    setFieldValue: (field: string, value: Genre[]) => void,
    newValue: Genre,
    currentValues?: Genre[],
  ) => {
    if (!currentValues) {
      setFieldValue('genres', [newValue]);
    } else if (currentValues.includes(newValue)) {
      const nextGenres = currentValues.filter(g => g !== newValue);
      setFieldValue('genres', nextGenres);
      return;
    } else {
      setFieldValue('genres', [...currentValues, newValue]);
    }
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
      {({ setFieldValue, values }) => (
        <Form className="flex flex-col gap-4 h-full">
          <div className="flex items-center px-4">
            <div className="h-30 w-30 mr-2 flex flex-col items-center text-gray-80">
              <ImageUpload
                artwork={true}
                onChange={val => onArtworkUpload(val, setFieldValue)}
                onUpload={setUploadingArt}
                initialValue={initialValues?.artworkFile}
                className="border-0"
                rounded="rounded-none"
              />
              <span className="underline text-xxs mt-2 font-bold">
                {uploadingArt ? 'UPLOADING...' : 'CHANGE ARTWORK'}
              </span>
              <span className="font-semibold text-[9px]">(Max: 60mb)</span>
            </div>
            <div className="flex flex-col flex-1 gap-2">
              <InputField name="title" type="text" label="TRACK TITLE" maxLength={100} />
              <InputField name="artist" type="text" label="ARTIST" disabled />
            </div>
          </div>
          <div className="px-4">
            <TextareaField rows={3} name="description" label="DESCRIPTION" maxLength={500} />
          </div>
          <div className="px-4">
            <InputField name="album" type="text" label="ALBUM" maxLength={100} />
          </div>
          <div className="px-4 flex gap-4 w-full">
            <InputField name="releaseYear" type="number" label="RELEASE YEAR" />
            <InputField name="copyright" type="text" label="COPYRIGHT" maxLength={100} />
          </div>
          <div className="text-gray-80 font-bold px-4">
            Select Genres {values.genres && `(${values.genres.length} Selected)`}
          </div>
          <div className="px-4 flex flex-wrap gap-2">
            {genres.map(({ label, key }: GenreLabel) => (
              <Badge
                key={key}
                label={label}
                selected={values.genres ? values.genres.includes(key) : false}
                onClick={() => handleGenreClick(setFieldValue, key, values.genres)}
                className=""
              />
            ))}
          </div>

          <div>
            <div className="bg-gray-20 text-gray-80 flex justify-between p-4">
              <label htmlFor="royalty" className="flex flex-col">
                <span className="text-[11px] uppercase font-bold">Royalty %</span>
                <span className="text-[9px]">
                  Setting a royalty % will allow you to earn a cut on all secondary sales.
                </span>
              </label>
              <div>
                <InputField name="royalty" type="number" symbol="%" alignTextCenter step={1} />
              </div>
            </div>
            <WalletSelector />
          </div>

          <div className="pl-4 pr-4 pb-4 flex items-center mt-4">
            <div className="flex-1">
              {enoughFunds && !uploadingArt && (
                <div className="flex gap-2">
                  <Matic value={maxGasFee} variant="currency" className="flex-1" />
                  <Button type="submit" variant="outline" borderColor="bg-purple-gradient" className="w-full flex-1">
                    MINT NFT
                  </Button>
                </div>
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
