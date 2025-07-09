import { Badge } from 'components/common/Badges/Badge'
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import { TextareaField } from 'components/TextareaField'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { Form, Formik, FormikErrors } from 'formik'
import { useMaxMintGasFee } from 'hooks/useMaxMintGasFee'
import { useWalletContext } from 'hooks/useWalletContext'
import { Genre } from 'lib/graphql'
import { useEffect, useState } from 'react'
import { GenreLabel, genres } from 'utils/Genres'
import * as yup from 'yup'
import { ArtworkUploader } from './ArtworkUploader'

export interface FormValues {
  editionQuantity: number
  title: string
  description: string
  utilityInfo?: string
  album?: string
  copyright?: string
  releaseYear?: number
  genres?: Genre[]
  artworkFile?: File | null
  royalty: number
  ISRC?: string
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  editionQuantity: yup.number().label('# of Editions').min(1).max(1000).required('# of Editions is a required field'),
  title: yup.string().max(100).required('Title is a required field'),
  description: yup.string().max(2500).required('Description is a required field'),
  ISRC: yup.string().min(12).max(50).optional(),
  utilityInfo: yup.string().max(10000),
  artist: yup.string(),
  album: yup.string().max(100),
  copyright: yup.string().max(100),
  releaseYear: yup.number(),
  genres: yup.array(),
  artworkFile: yup.mixed().required('Artwork is required'),
  royalty: yup.number().integer().min(0).max(100).required('Royalty is a required field'),
})

export interface InitialValues extends Omit<Partial<FormValues>, 'artworkUrl'> {
  artworkFile?: File
}

interface Props {
  initialValues?: InitialValues
  handleSubmit: (values: FormValues) => void
}

export const TrackMetadataForm = ({ initialValues, handleSubmit }: Props) => {
  const defaultValues: FormValues = {
    editionQuantity: initialValues?.editionQuantity || 1,
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    utilityInfo: initialValues?.utilityInfo || '',
    album: initialValues?.album || '',
    copyright: initialValues?.copyright || '',
    releaseYear: initialValues?.releaseYear || new Date().getFullYear(),
    genres: initialValues?.genres || [],
    artworkFile: initialValues?.artworkFile || null,
    royalty: 0,
    ISRC: initialValues?.ISRC || '',
  }

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values, errors }) => {
        return <InnerForm setFieldValue={setFieldValue} values={values} errors={errors} initialValues={initialValues} />
      }}
    </Formik>
  )
}

interface InnerFormProps {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setFieldValue: (field: string, value: any) => void
  errors: FormikErrors<FormValues>
  values: FormValues
  initialValues?: InitialValues
}

function InnerForm(props: InnerFormProps) {
  const { setFieldValue, errors, values, initialValues } = props
  const maxMintGasFee = useMaxMintGasFee(values.editionQuantity)
  const [enoughFunds, setEnoughFunds] = useState<boolean>()
  const { balance } = useWalletContext()

  const handleGenreClick = (
    setFieldValue: (field: string, value: Genre[]) => void,
    newValue: Genre,
    currentValues?: Genre[],
  ) => {
    if (!currentValues) {
      setFieldValue('genres', [newValue])
    } else if (currentValues.includes(newValue)) {
      const nextGenres = currentValues.filter(g => g !== newValue)
      setFieldValue('genres', nextGenres)
      return
    } else {
      setFieldValue('genres', [...currentValues, newValue])
    }
  }

  useEffect(() => {
    if (balance && maxMintGasFee) {
      setEnoughFunds(Number(balance) > Number(maxMintGasFee))
    }
  }, [maxMintGasFee, balance])

  return (
    <Form className="flex h-full flex-col gap-4" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
      <div className="flex items-center gap-2 px-4">
        <p className="max-w-5/10 text-xxs font-bold leading-tight text-gray-80">
          Enter the number of NFT editions to mint. This cannot be changed after minting.
        </p>
        <div className="flex w-full flex-col">
          <InputField name="editionQuantity" type="number" label="# OF EDITIONS" />
        </div>
      </div>
      <div className="flex gap-4 px-4">
        <ArtworkUploader
          name="artworkFile"
          error={errors.artworkFile}
          initialValue={initialValues?.artworkFile}
          onFileChange={file => setFieldValue('artworkFile', file)}
        />
        <div className="flex flex-1 flex-col gap-2">
          <InputField name="title" type="text" label="TRACK TITLE" maxLength={100} />
          <InputField name="album" type="text" label="ALBUM" maxLength={100} />
        </div>
      </div>
      <div className="px-4">
        <TextareaField rows={3} name="description" label="DESCRIPTION" maxLength={500} />
      </div>
      <div className="flex w-full gap-4 px-4">
        <InputField name="releaseYear" type="number" label="RELEASE YEAR" />
        <InputField name="copyright" type="text" label="COPYRIGHT" maxLength={100} />
        <InputField name="ISRC" type="text" label="ISRC" maxLength={25} />
      </div>
      <div className="px-4">
        <TextareaField rows={3} name="utilityInfo" label="UTILITY" maxLength={500} />
      </div>
      <div className="px-4 font-bold text-gray-80">
        Select Genres {values.genres && `(${values.genres.length} Selected)`}
      </div>
      <div className="flex flex-wrap gap-2 px-4">
        {genres.map(({ label, key }: GenreLabel) => (
          <Badge
            key={key}
            label={label}
            selected={values.genres ? values.genres.includes(key) : false}
            onClick={() => handleGenreClick(setFieldValue, key, values.genres)}
          />
        ))}
      </div>
      <div>
        <div className="flex justify-between gap-2 bg-gray-20 p-4 text-gray-80">
          <label htmlFor="royalty">
            <div className="text-[11px] font-bold uppercase">Royalty %</div>
            <div className="text-[9px]">Setting a royalty % will allow you to earn a cut on all secondary sales.</div>
          </label>
          <div>
            <InputField name="royalty" type="number" symbol="%" alignTextCenter step={1} />
          </div>
        </div>
        <WalletSelector />
      </div>

      <div className="mt-4 flex items-center pl-4 pr-4 pb-4">
        <div className="flex-1">
          {enoughFunds && (
            <div className="flex gap-2">
              <Matic value={maxMintGasFee} variant="currency" className="flex-1" />
              <Button type="submit" variant="outline" borderColor="bg-purple-gradient" className="w-full flex-1">
                MINT NFT
              </Button>
            </div>
          )}
          {!enoughFunds && (
            <div className="text-right text-sm font-bold text-white">
              {`It seems like you might have not enough funds `}
              <span className="whitespace-nowrap">:(</span>
            </div>
          )}
        </div>
      </div>
    </Form>
  )
}
