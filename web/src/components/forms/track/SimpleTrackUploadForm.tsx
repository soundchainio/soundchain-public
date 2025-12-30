/**
 * SimpleTrackUploadForm - Non-Web3 Music Upload (Like Bandcamp/DistroKid)
 *
 * Allows artists to upload music and get SCid codes without:
 * - Wallet connection
 * - Gas fees
 * - NFT minting
 *
 * Artists get a downloadable certificate they can save to their devices,
 * giving them full control and proof of their music registration.
 *
 * Flow: Upload → Metadata → IPFS → Get SCid → Download Certificate!
 */

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Field, Form, Formik } from 'formik'
import * as yup from 'yup'
import { Badge } from 'components/common/Badges/Badge'
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { TextareaField } from 'components/TextareaField'
import { Genre } from 'lib/graphql'
import { genres, GenreLabel } from 'utils/Genres'
import { Music, Upload, Image as ImageIcon, CheckCircle, Loader2, Download, Copy, Share2 } from 'lucide-react'
import {
  generateCertificate,
  downloadCertificates,
  downloadCertificateJSON,
  downloadCertificateText,
  copyCertificateToClipboard,
  SCidCertificateData,
} from 'utils/SCidCertificate'

interface SimpleTrackFormValues {
  title: string
  artist: string
  album?: string
  description?: string
  releaseYear?: number
  copyright?: string
  genres: Genre[]
}

const validationSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(100),
  artist: yup.string().max(100),
  album: yup.string().max(100),
  description: yup.string().max(2500),
  releaseYear: yup.number().min(1900).max(2030),
  copyright: yup.string().max(100),
  genres: yup.array().of(yup.string()),
})

interface UploadResult {
  trackId: string
  scid: string
  message: string
  ipfsCid: string
  ipfsGatewayUrl: string
  chainCode?: string
  checksum?: string
}

interface Props {
  onUploadComplete?: (result: UploadResult) => void
  onUploadAudio: (file: File) => Promise<string> // Returns assetUrl
  onUploadArtwork: (file: File) => Promise<string> // Returns artworkUrl
  onSubmit: (data: {
    title: string
    artist?: string
    album?: string
    description?: string
    releaseYear?: number
    copyright?: string
    genres?: Genre[]
    assetUrl: string
    artworkUrl?: string
    saveToDatabase?: boolean // Optional: skip DB storage
  }) => Promise<UploadResult>
}

export function SimpleTrackUploadForm({ onUploadComplete, onUploadAudio, onUploadArtwork, onSubmit }: Props) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingArtwork, setUploadingArtwork] = useState(false)
  const [assetUrl, setAssetUrl] = useState<string | null>(null)
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [certificate, setCertificate] = useState<SCidCertificateData | null>(null)
  const [skipDatabase, setSkipDatabase] = useState(false)

  // Audio dropzone
  const onDropAudio = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setAudioFile(file)
    setUploadingAudio(true)

    try {
      const url = await onUploadAudio(file)
      setAssetUrl(url)
    } catch (error) {
      console.error('Failed to upload audio:', error)
      setAudioFile(null)
    } finally {
      setUploadingAudio(false)
    }
  }, [onUploadAudio])

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onDropAudio,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  // Artwork dropzone
  const onDropArtwork = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setArtworkFile(file)
    setArtworkPreview(URL.createObjectURL(file))
    setUploadingArtwork(true)

    try {
      const url = await onUploadArtwork(file)
      setArtworkUrl(url)
    } catch (error) {
      console.error('Failed to upload artwork:', error)
      setArtworkFile(null)
      setArtworkPreview(null)
    } finally {
      setUploadingArtwork(false)
    }
  }, [onUploadArtwork])

  const { getRootProps: getArtworkRootProps, getInputProps: getArtworkInputProps, isDragActive: isArtworkDragActive } = useDropzone({
    onDrop: onDropArtwork,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleSubmit = async (values: SimpleTrackFormValues) => {
    if (!assetUrl) {
      alert('Please upload an audio file first')
      return
    }

    setSubmitting(true)
    try {
      const uploadResult = await onSubmit({
        title: values.title,
        artist: values.artist || undefined,
        album: values.album || undefined,
        description: values.description || undefined,
        releaseYear: values.releaseYear || undefined,
        copyright: values.copyright || undefined,
        genres: values.genres.length > 0 ? values.genres : undefined,
        assetUrl,
        artworkUrl: artworkUrl || undefined,
        saveToDatabase: !skipDatabase,
      })

      // Generate certificate for artist to download
      const cert = generateCertificate({
        scid: uploadResult.scid,
        chainCode: uploadResult.chainCode,
        trackId: uploadResult.trackId,
        title: values.title,
        artist: values.artist,
        album: values.album,
        description: values.description,
        releaseYear: values.releaseYear,
        copyright: values.copyright,
        genres: values.genres,
        ipfsCid: uploadResult.ipfsCid,
        ipfsGatewayUrl: uploadResult.ipfsGatewayUrl,
        checksum: uploadResult.checksum,
      })
      setCertificate(cert)

      setResult(uploadResult)
      onUploadComplete?.(uploadResult)
    } catch (error) {
      console.error('Failed to create track:', error)
      alert('Failed to upload track. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenreClick = (
    setFieldValue: (field: string, value: Genre[]) => void,
    newValue: Genre,
    currentValues: Genre[],
  ) => {
    if (currentValues.includes(newValue)) {
      setFieldValue('genres', currentValues.filter(g => g !== newValue))
    } else {
      setFieldValue('genres', [...currentValues, newValue])
    }
  }

  // Success state
  if (result && certificate) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Upload Complete!</h2>
        <p className="text-gray-400">{result.message}</p>

        {/* SCid Display */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 rounded-lg p-4 w-full max-w-md">
          <p className="text-sm text-gray-400">Your SCid</p>
          <p className="text-xl font-mono text-cyan-400">{result.scid}</p>
        </div>

        {/* IPFS Info */}
        <div className="bg-gray-800/50 rounded-lg p-4 w-full max-w-md text-left">
          <p className="text-sm font-bold text-gray-300 mb-2">IPFS Storage (Decentralized)</p>
          <p className="text-xs text-gray-400 break-all">
            <span className="text-gray-500">CID:</span> {result.ipfsCid}
          </p>
        </div>

        {/* Download Certificate Section */}
        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg p-6 w-full max-w-md">
          <p className="text-sm font-bold text-white mb-2">Download Your Certificate</p>
          <p className="text-xs text-gray-400 mb-4">
            Save this certificate to your device. It's your proof of registration - keep it safe!
          </p>

          {/* Primary Download Button */}
          <Button
            type="button"
            variant="outline"
            borderColor="bg-cyan-gradient"
            className="w-full mb-3"
            onClick={() => downloadCertificates(certificate)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Certificate (JSON + TXT)
          </Button>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => downloadCertificateJSON(certificate)}
            >
              <Download className="w-3 h-3 mr-1" />
              JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => downloadCertificateText(certificate)}
            >
              <Download className="w-3 h-3 mr-1" />
              TXT
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-sm"
              onClick={async () => {
                const copied = await copyCertificateToClipboard(certificate)
                if (copied) {
                  alert('Certificate copied to clipboard!')
                }
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Your track is now on IPFS and ready for streaming worldwide.
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setResult(null)
            setCertificate(null)
            setAudioFile(null)
            setArtworkFile(null)
            setArtworkPreview(null)
            setAssetUrl(null)
            setArtworkUrl(null)
          }}
        >
          Upload Another Track
        </Button>
      </div>
    )
  }

  return (
    <Formik<SimpleTrackFormValues>
      initialValues={{
        title: '',
        artist: '',
        album: '',
        description: '',
        releaseYear: new Date().getFullYear(),
        copyright: '',
        genres: [],
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values }) => (
        <Form className="space-y-6">
          {/* Header */}
          <div className="text-center pb-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Upload Your Music</h2>
            <p className="text-sm text-gray-400 mt-1">
              No wallet needed. Get your SCid instantly.
            </p>
          </div>

          {/* Audio Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              AUDIO FILE *
            </label>
            <div
              {...getAudioRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                ${isAudioDragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'}
                ${audioFile ? 'border-green-500 bg-green-500/10' : ''}
              `}
            >
              <input {...getAudioInputProps()} />
              {uploadingAudio ? (
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : audioFile ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-6 h-6" />
                  <span>{audioFile.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Music className="w-10 h-10" />
                  <p>Drag & drop your audio file here</p>
                  <p className="text-xs">MP3, WAV, FLAC, AAC, OGG, M4A (max 100MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Artwork & Basic Info Row */}
          <div className="flex gap-4">
            {/* Artwork Upload */}
            <div className="w-32 flex-shrink-0">
              <label className="block text-sm font-bold text-gray-300 mb-2">
                ARTWORK
              </label>
              <div
                {...getArtworkRootProps()}
                className={`
                  aspect-square border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden
                  ${isArtworkDragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'}
                  ${artworkPreview ? 'border-none' : ''}
                `}
              >
                <input {...getArtworkInputProps()} />
                {uploadingArtwork ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : artworkPreview ? (
                  <img src={artworkPreview} alt="Artwork" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-xs text-center">Add cover</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title & Artist */}
            <div className="flex-1 space-y-3">
              <InputField name="title" type="text" label="TRACK TITLE *" maxLength={100} />
              <InputField name="artist" type="text" label="ARTIST NAME" maxLength={100} />
            </div>
          </div>

          {/* Album & Year Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <InputField name="album" type="text" label="ALBUM" maxLength={100} />
            </div>
            <div className="w-32">
              <InputField name="releaseYear" type="number" label="YEAR" />
            </div>
          </div>

          {/* Description */}
          <Field
            name="description"
            as={TextareaField}
            rows={3}
            label="DESCRIPTION"
            maxLength={2500}
          />

          {/* Copyright */}
          <InputField name="copyright" type="text" label="COPYRIGHT" maxLength={100} placeholder="© 2024 Artist Name" />

          {/* Genres */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              GENRES {values.genres.length > 0 && `(${values.genres.length} selected)`}
            </label>
            <div className="flex flex-wrap gap-2">
              {genres.map(({ label, key }: GenreLabel) => (
                <Badge
                  key={key}
                  label={label}
                  selected={values.genres.includes(key)}
                  onClick={() => handleGenreClick(setFieldValue, key, values.genres)}
                />
              ))}
            </div>
          </div>

          {/* Storage Options */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDatabase}
                onChange={(e) => setSkipDatabase(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
              />
              <div>
                <span className="text-sm font-medium text-white">Certificate Only (No Database)</span>
                <p className="text-xs text-gray-400 mt-1">
                  Your track will be stored on IPFS but not in SoundChain's database.
                  You'll download a certificate as proof of registration.
                  Perfect for full artist control.
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-700">
            <Button
              type="submit"
              variant="outline"
              borderColor="bg-cyan-gradient"
              className="w-full py-3 text-lg"
              disabled={!assetUrl || submitting}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading to IPFS...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  {skipDatabase ? 'Upload & Get Certificate' : 'Upload & Get SCid'}
                </span>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              No wallet or gas fees required. Your music will be stored on IPFS.
            </p>
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default SimpleTrackUploadForm
