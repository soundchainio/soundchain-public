import { Badge } from 'components/common/Badges/Badge'
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import { TextareaField } from 'components/TextareaField'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { config } from 'config'
import { Field, Form, Formik, FormikErrors } from 'formik'
import { useMaxMintGasFee } from 'hooks/useMaxMintGasFee'
import { useWalletContext } from 'hooks/useWalletContext'
import { useMagicContext } from 'hooks/useMagicContext'
import { Genre } from 'lib/graphql'
import { useEffect, useState } from 'react'
import { GenreLabel, genres } from 'utils/Genres'
import * as yup from 'yup'
import { ArtworkUploader } from './ArtworkUploader'

// Supported blockchain chains
const supportedChains = ['Polygon', 'Ethereum', 'Solana', 'Base', 'Tezos'];

// Role categories and sub-roles
const collaboratorCategories = {
  Music: ['Singer', 'Guitarist', 'Bassist', 'Drummer', 'Keyboardist', 'Pianist', 'Percussionist', 'Background Singer', 'Horns Section', 'Sound Engineer', 'Producer', 'Beatmaker'],
  Film: ['Cinematographer', 'Photographer', 'Director', 'Editor', 'Graphics Designer', 'VFX', 'Grip'],
  Art: ['Painter', 'Graffiti Artist'],
}


export interface FormValues {
  editionQuantity: number
  title: string
  description: string
  utilityInfo?: string
  album?: string
  copyright?: string
  releaseYear?: number
  genres?: Genre[]
  artworkFile?: File
  royalty: number
  ISRC?: string
  collaborators: { walletAddress: string; royaltyPercentage: number; role: string }[]
  chain: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  editionQuantity: yup.number().label('# of Editions').min(1).max(1000).required('# of Editions is a required field'),
  title: yup.string().max(100).required('Title is a required field'),
  description: yup.string().max(2500).required('Description is a required field'),
  utilityInfo: yup.string().max(10000).required('Utility info is a required field'),
  ISRC: yup.string().min(12).max(50).optional(),
  album: yup.string().max(100),
  copyright: yup.string().max(100),
  releaseYear: yup.number(),
  genres: yup.array(),
  artworkFile: yup.mixed<File>()
    .required('Artwork is required')
    .test('isFile', 'Must be a valid file', value => {
      if (!value) return false;
      if (!(value instanceof File)) return false;
      const file = value as File;
      return (
        file.size > 0 &&
        typeof file.lastModified === 'number' &&
        typeof file.name === 'string' &&
        typeof file.size === 'number' &&
        typeof file.type === 'string' &&
        typeof file.webkitRelativePath === 'string'
      );
    }),
  royalty: yup.number().integer().min(0).max(100).required('Royalty is a required field'),
  collaborators: yup.array().of(
    yup.object().shape({
      walletAddress: yup.string().required('Wallet address is required'),
      royaltyPercentage: yup.number().min(0).max(100).required('Royalty percentage is required'),
      role: yup.string().oneOf([...Object.values(collaboratorCategories).flat()], 'Invalid role').required('Role is required'),
    })
  ).required('Collaborators are required').min(1, 'At least one collaborator is required').default([]),
  chain: yup.string().oneOf(supportedChains, 'Invalid chain').required('Chain selection is required'),
})

export interface InitialValues extends Omit<Partial<FormValues>, 'artworkUrl'> {
  artworkFile?: File
  collaborators: { walletAddress: string; royaltyPercentage: number; role: string }[]
  chain?: string
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
    artworkFile: initialValues?.artworkFile || undefined,
    royalty: initialValues?.royalty || 0,
    ISRC: initialValues?.ISRC || '',
    collaborators: initialValues?.collaborators || [{ walletAddress: '', royaltyPercentage: 0, role: '' }],
    chain: initialValues?.chain || 'Polygon',
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
  setFieldValue: (field: string, value: any) => void
  errors: FormikErrors<FormValues>
  values: FormValues
  initialValues?: InitialValues
}

function InnerForm(props: InnerFormProps) {
  const { setFieldValue, errors, values, initialValues } = props
  const maxMintGasFee = useMaxMintGasFee(values.editionQuantity)
  const [enoughFunds, setEnoughFunds] = useState<boolean>()

  const [dictionary, setDictionary] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('typo-js').then((Typo) => {
        setDictionary(new Typo.default('en_US'))
      })
    }
  }, [])
  const { balance } = useWalletContext()
  const { account: magicWalletAddress } = useMagicContext()
  const [isCollaboratorExpanded, setIsCollaboratorExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof collaboratorCategories>('Music')

  // Auto-fill first collaborator with user's OAuth wallet address
  useEffect(() => {
    if (magicWalletAddress && values.collaborators.length > 0 && !values.collaborators[0].walletAddress) {
      const newCollaborators = [...values.collaborators]
      newCollaborators[0] = { ...newCollaborators[0], walletAddress: magicWalletAddress }
      setFieldValue('collaborators', newCollaborators)
    }
  }, [magicWalletAddress])

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

  // Calculate platform fee: 0.05% of estimated gas cost, with minimum threshold
  const MINIMUM_PLATFORM_FEE = 0.001 // 0.001 POL minimum (~$0.001)
  const gasCost = maxMintGasFee ? parseFloat(maxMintGasFee) : 0
  const calculatedFee = gasCost * config.soundchainFee
  const platformFee = Math.max(calculatedFee, MINIMUM_PLATFORM_FEE)

  useEffect(() => {
    if (balance && maxMintGasFee) {
      // Include platform fee in funds check
      const totalCost = gasCost + platformFee
      setEnoughFunds(Number(balance) > totalCost)
    }
  }, [maxMintGasFee, balance, gasCost, platformFee])

  const addCollaborator = () => {
    setFieldValue('collaborators', [...values.collaborators, { walletAddress: '', royaltyPercentage: 0, role: '' }])
  }

  const updateCollaborator = (index: number, field: string, value: string | number) => {
    const newCollaborators = [...values.collaborators]
    newCollaborators[index] = { ...newCollaborators[index], [field]: value }
    setFieldValue('collaborators', newCollaborators)
  }

  const removeCollaborator = (index: number) => {
    const newCollaborators = values.collaborators.filter((_, i) => i !== index)
    setFieldValue('collaborators', newCollaborators)
  }

  const toggleCollaborators = () => {
    setIsCollaboratorExpanded(!isCollaboratorExpanded)
  }

  const autoCorrectText = (field: string, value: string) => {
    if (!dictionary) return value;
    const suggestions = dictionary.suggest(value);
    if (suggestions.length > 0 && suggestions[0] !== value) {
      setFieldValue(field, suggestions[0]);
      return suggestions[0];
    }
    return value;
  };

  const handleTextareaChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= (field === 'description' ? 2500 : 10000)) {
      setFieldValue(field, autoCorrectText(field, value));
    }
  };

  const renderCollaboratorErrors = (errors: FormikErrors<FormValues>) => {
    if (errors.collaborators && Array.isArray(errors.collaborators)) {
      return errors.collaborators.map((error, index) => {
        const errorMessages = Object.values(error as any).filter(Boolean).join(', ');
        return errorMessages ? <span key={index} className="text-red-500 text-xs mt-1">{errorMessages}</span> : null;
      });
    } else if (errors.collaborators && typeof errors.collaborators === 'string') {
      return <span className="text-red-500 text-xs mt-1">{errors.collaborators}</span>;
    }
    return null;
  };

  return (
    <Form className="flex h-full flex-col gap-4 relative">
      {/* Chain Selection */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-bold text-gray-80">MINT ON CHAIN</label>
          <div className="group relative">
            <span className="cursor-help text-cyan-400 text-xs border border-cyan-400 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
            <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-cyan-500/50 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
              <p className="font-bold text-cyan-400 mb-2">Cross-Chain Minting</p>
              <p className="mb-2">Polygon recommended for lowest gas fees!</p>
            </div>
          </div>
        </div>
        <select
          value={values.chain}
          onChange={(e) => setFieldValue('chain', e.target.value)}
          className="p-2 border border-gray-30 rounded w-full bg-gray-20 text-white text-sm"
        >
          {supportedChains.map(chain => (
            <option key={chain} value={chain}>
              {chain} {chain === 'Polygon' ? '(Recommended - Low Gas)' : chain === 'Solana' ? '(Coming Soon)' : ''}
            </option>
          ))}
        </select>
        {errors.chain && <p className="text-red-500 text-xs mt-1">{errors.chain}</p>}
      </div>
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
        <Field
          name="description"
          as={TextareaField}
          rows={3}
          label="DESCRIPTION"
          maxLength={2500}
          onChange={handleTextareaChange('description')}
        />
      </div>
      <div className="flex w-full gap-4 px-4">
        <InputField name="releaseYear" type="number" label="RELEASE YEAR" />
        <InputField name="copyright" type="text" label="COPYRIGHT" maxLength={100} />
        <InputField name="ISRC" type="text" label="ISRC" maxLength={25} />
      </div>
      <div className="px-4">
        <Field
          name="utilityInfo"
          as={TextareaField}
          rows={3}
          label="UTILITY"
          maxLength={10000}
          onChange={handleTextareaChange('utilityInfo')}
        />
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
      {/* Collaborators Section - Always Visible */}
      <div className="px-4">
        <button
          type="button"
          onClick={toggleCollaborators}
          className="w-full flex items-center justify-between p-3 bg-gray-20 border border-gray-30 rounded"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase text-white">Collaborators</h3>
            <span className="text-xs text-gray-60">({values.collaborators.length})</span>
          </div>
          <span className="text-gray-60">{isCollaboratorExpanded ? '▲' : '▼'}</span>
        </button>

        {/* Always show collaborator summary */}
        <div className="mt-2 space-y-1">
          {values.collaborators.map((collaborator, index) => (
            <div key={index} className="flex items-center justify-between text-xs text-gray-300 py-1">
              <span className="text-white font-mono">
                {collaborator.role || 'Select role'} - {collaborator.walletAddress ? `${collaborator.walletAddress.slice(0, 8)}...` : 'Add wallet'} ({collaborator.royaltyPercentage}%)
              </span>
            </div>
          ))}
        </div>
        {renderCollaboratorErrors(errors)}

        {/* Expanded collaborator editing */}
        {isCollaboratorExpanded && (
          <div className="mt-3 p-3 bg-gray-15 border border-gray-30 rounded space-y-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as keyof typeof collaboratorCategories)}
              className="p-2 border border-gray-30 rounded bg-gray-20 text-white text-sm w-full"
            >
              {Object.keys(collaboratorCategories).map(category => (
                <option key={category} value={category} className="bg-gray-900 text-white">{category}</option>
              ))}
            </select>

            {values.collaborators.map((collaborator, index) => (
              <div key={index} className="flex flex-col gap-2 p-2 bg-gray-20 rounded">
                <div className="flex gap-2">
                  <select
                    value={collaborator.role}
                    onChange={e => updateCollaborator(index, 'role', e.target.value)}
                    className="flex-1 p-2 border border-gray-30 rounded bg-gray-25 text-white text-xs"
                  >
                    <option value="" className="bg-gray-900 text-white">Select Role</option>
                    {collaboratorCategories[selectedCategory].map(role => (
                      <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={collaborator.royaltyPercentage}
                    onChange={e => updateCollaborator(index, 'royaltyPercentage', Number(e.target.value))}
                    placeholder="%"
                    className="w-16 p-2 border border-gray-30 rounded bg-gray-25 text-xs text-center collaborator-input"
                    style={{ color: 'white', WebkitTextFillColor: 'white', colorScheme: 'dark' }}
                    min={0}
                    max={100}
                  />
                  <button
                    type="button"
                    onClick={() => removeCollaborator(index)}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-400/20 rounded"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  value={collaborator.walletAddress}
                  onChange={e => updateCollaborator(index, 'walletAddress', e.target.value)}
                  placeholder="Wallet address (0x...)"
                  className="w-full p-2 border border-gray-30 rounded bg-gray-25 text-xs font-mono text-white"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addCollaborator}
              className="w-full p-2 border border-dashed border-gray-50 rounded text-gray-60 text-xs hover:border-cyan-400 hover:text-cyan-400"
            >
              + Add Collaborator
            </button>
          </div>
        )}
      </div>

      {/* Wallet Selector */}
      <WalletSelector />

      {/* Mint Section - Shows Gas + Platform Fee (0.05% of gas) */}
      <div className="px-4 pb-4 mt-2">
        <div className="flex flex-col gap-2 mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Est. Gas Fee ({values.editionQuantity} NFT{values.editionQuantity > 1 ? 's' : ''})</span>
            <Matic value={maxMintGasFee || '0'} variant="currency" />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">
              Platform Fee {calculatedFee < MINIMUM_PLATFORM_FEE ? '(min)' : '(0.05%)'}
            </span>
            <span className="text-cyan-400 font-mono">{platformFee.toFixed(4)} POL</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between items-center text-xs">
            <span className="text-white font-bold">Total Est. Cost</span>
            <span className="text-green-400 font-bold font-mono">
              {(gasCost + platformFee).toFixed(4)} POL
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xxs text-gray-500">
              0.05% fee supports OGUN rewards
            </p>
            <span className="text-xxs text-yellow-400 font-bold">
              2x OGUN vs SCid-only
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="outline"
            borderColor="bg-purple-gradient"
            className="w-full px-6 py-2 text-sm"
            disabled={!enoughFunds}
          >
            MINT NFT
          </Button>
        </div>
        {!enoughFunds && balance !== undefined && (
          <p className="text-xs text-red-400 mt-2">Insufficient funds for gas + platform fee</p>
        )}
      </div>

    </Form>
  )
}
