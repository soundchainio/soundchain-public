import dynamic from "next/dynamic";
import { Badge } from 'components/common/Badges/Badge'
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import { TextareaField } from 'components/TextareaField'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { Field, Form, Formik, FormikErrors } from 'formik'
import { useMaxMintGasFee } from 'hooks/useMaxMintGasFee'
import { useWalletContext } from 'hooks/useWalletContext'
import { Genre } from 'lib/graphql'
import { useEffect, useState, ReactNode } from 'react'
import { GenreLabel, genres } from 'utils/Genres'
import * as yup from 'yup'
import { ArtworkUploader } from './ArtworkUploader'
import { Modal } from 'components/Modal'
import { useWalletConnect } from 'hooks/useWalletConnect'

// Supported blockchain chains
const supportedChains = ['Polygon', 'Ethereum', 'Solana', 'Base', 'Tezos'];

// Role categories and sub-roles
const collaboratorCategories = {
  Music: ['Singer', 'Guitarist', 'Bassist', 'Drummer', 'Keyboardist', 'Pianist', 'Percussionist', 'Background Singer', 'Horns Section', 'Sound Engineer', 'Producer', 'Beatmaker'],
  Film: ['Cinematographer', 'Photographer', 'Director', 'Editor', 'Graphics Designer', 'VFX', 'Grip'],
  Art: ['Painter', 'Graffiti Artist'],
}

// Locally extended ModalProps to include className (though not used directly here)
interface ModalProps {
  show: boolean;
  children: ReactNode;
  title: string | JSX.Element;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
  onClose: (open: boolean) => void;
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

  const { connect, disconnect, provider, account } = useWalletConnect();

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values, errors }) => {
        return <InnerForm setFieldValue={setFieldValue} values={values} errors={errors} initialValues={initialValues} connect={connect} disconnect={disconnect} provider={provider} account={account} />
      }}
    </Formik>
  )
}

interface InnerFormProps {
  setFieldValue: (field: string, value: any) => void
  errors: FormikErrors<FormValues>
  values: FormValues
  initialValues?: InitialValues
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  provider?: any
  account?: string
}

function InnerForm(props: InnerFormProps) {
  const { setFieldValue, errors, values, initialValues, connect, disconnect, provider, account } = props
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
  const [isSideModalOpen, setIsSideModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof collaboratorCategories>('Music')
  const [touchActive, setTouchActive] = useState(false)

  useEffect(() => {
    if (provider && account) {
      setFieldValue('collaborators', (prev: { walletAddress: string; royaltyPercentage: number; role: string }[]) => 
        prev.length > 0 ? prev.map(c => ({ ...c, walletAddress: account || c.walletAddress })) : [{ walletAddress: account || '', royaltyPercentage: 0, role: '' }]
      );
    }
  }, [account, provider, setFieldValue]);

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

  const addCollaborator = () => {
    setFieldValue('collaborators', [...values.collaborators, { walletAddress: account || '', royaltyPercentage: 0, role: '' }])
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

  const openSideModal = () => {
    if (!touchActive) setIsSideModalOpen(true);
  }
  const closeSideModal = () => {
    if (!touchActive) setIsSideModalOpen(false);
  }

  const handleTouchStart = () => {
    setTouchActive(true);
    setIsSideModalOpen(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const element = e.currentTarget.getBoundingClientRect();
    if (touch.clientX < element.left || touch.clientX > element.right || touch.clientY < element.top || touch.clientY > element.bottom) {
      setIsSideModalOpen(false);
    }
  };

  const handleTouchEnd = () => {
    setTouchActive(false);
    setTimeout(() => setIsSideModalOpen(false), 200);
  };

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
      <div className="px-4">
        <button
          onClick={() => connect()}
          className="p-2 bg-blue-500 text-white rounded mb-4 flex items-center"
        >
          <WalletConnectIcon className="mr-2" /> Connect Wallet
        </button>
        {account && <p>Connected: {account}</p>}

        {/* Chain Selection with Info Tooltip */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-bold text-gray-80">MINT ON CHAIN</label>
            <div className="group relative">
              <span className="cursor-help text-cyan-400 text-xs border border-cyan-400 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-cyan-500/50 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                <p className="font-bold text-cyan-400 mb-2">Cross-Chain Minting Info</p>
                <p className="mb-2"><strong>EVM Chains:</strong> Polygon, Ethereum, Base, Avalanche, BSC share the same wallet address format (0x...). Your collaborators can use the same address across all EVM chains.</p>
                <p className="mb-2"><strong>ZetaChain Integration:</strong> Coming soon! ZetaChain will enable cross-chain royalty distribution - collaborators can receive payments on their preferred chain automatically.</p>
                <p className="mb-2"><strong>Non-EVM Chains:</strong> Solana, Bitcoin use different address formats. ZetaChain is working on Solana support.</p>
                <p className="text-yellow-400"><strong>Tip:</strong> Polygon recommended for lowest gas fees!</p>
              </div>
            </div>
          </div>
          <select
            value={values.chain}
            onChange={(e) => setFieldValue('chain', e.target.value)}
            className="p-2 border rounded w-full bg-gray-800 text-white"
          >
            {supportedChains.map(chain => (
              <option key={chain} value={chain}>
                {chain} {chain === 'Polygon' ? '(Recommended - Low Gas)' : chain === 'Solana' ? '(Coming Soon)' : ''}
              </option>
            ))}
          </select>
        </div>
        {errors.chain && <p className="text-red-500 text-xs">{errors.chain}</p>}
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
      <div>
        <div
          className="px-4 mt-2 relative hover:bg-gray-30 transition-all duration-300 ease-in-out"
          onMouseEnter={openSideModal}
          onMouseLeave={closeSideModal}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase text-gray-80">Collaborators</h3>
            <div className="group relative">
              <span className="cursor-help text-cyan-400 text-[9px] border border-cyan-400 rounded-full w-3 h-3 inline-flex items-center justify-center">?</span>
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 border border-cyan-500/50 rounded-lg text-[10px] text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                <p className="font-bold text-cyan-400 mb-1">Multi-Chain Collaborators</p>
                <p className="mb-1">Add band members, producers, or anyone who should receive royalties from this NFT.</p>
                <p className="mb-1"><strong>EVM Wallets (0x...):</strong> Work on Polygon, Ethereum, Base, Avalanche, BSC - same address!</p>
                <p className="text-yellow-400"><strong>Coming Soon:</strong> ZetaChain will auto-distribute royalties to each collaborator's preferred chain.</p>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-gray-80">Tap/Hover to add collaborators (total royalty must not exceed 100%).</p>
          {values.collaborators.map((collaborator, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <span>{collaborator.role}: {collaborator.walletAddress} ({collaborator.royaltyPercentage}%)</span>
              <Button variant="outline" onClick={() => removeCollaborator(index)} className="h-10 w-10">-</Button>
            </div>
          ))}
          {renderCollaboratorErrors(errors)}
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

      <Modal
        show={isSideModalOpen}
        onClose={closeSideModal}
        title="Add Collaborators"
      >
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as keyof typeof collaboratorCategories)}
          className="p-2 border rounded mb-4 w-full"
        >
          {Object.keys(collaboratorCategories).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        {values.collaborators.map((collaborator, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <select
              value={collaborator.role}
              onChange={e => updateCollaborator(index, 'role', e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Select Role</option>
              {collaboratorCategories[selectedCategory].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <InputField
              name={`collaborators[${index}].walletAddress`} // Added name prop
              label="Wallet Address"
              type="text"
              value={collaborator.walletAddress}
              onChange={e => updateCollaborator(index, 'walletAddress', e.target.value)}
            />
            <InputField
              name={`collaborators[${index}].royaltyPercentage`} // Added name prop
              label="Royalty %"
              type="number"
              value={collaborator.royaltyPercentage}
              onChange={e => updateCollaborator(index, 'royaltyPercentage', Number(e.target.value))}
              symbol="%"
              step={1}
            />
            <Button variant="outline" onClick={() => removeCollaborator(index)} className="h-10 w-10">-</Button>
          </div>
        ))}
        <Button variant="outline" onClick={addCollaborator} className="mt-2 h-10 w-full">Add Another Collaborator</Button>
        <Button variant="outline" onClick={closeSideModal} className="mt-2 h-10 w-full">Save and Close</Button>
      </Modal>
    </Form>
  )
}

// WalletConnect Icon Component
const WalletConnectIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM11 16H13V14H15V12H13V10H11V12H9V14H11V16Z" fill="currentColor"/>
  </svg>
);
