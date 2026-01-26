import ID3Writer from 'browser-id3-writer'
import classNames from 'classnames'
import { Button } from 'components/common/Buttons/Button'
import { FormValues, InitialValues, TrackMetadataForm } from 'components/forms/track/TrackMetadataForm'
import { TrackUploader } from 'components/forms/track/TrackUploader'
import { SimpleTrackUploadForm } from 'components/forms/track/SimpleTrackUploadForm'
import { Modal } from 'components/Modal'
import { config } from 'config'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { useUpload } from 'hooks/useUpload'
import { useWalletContext } from 'hooks/useWalletContext'
import {
  CreateMultipleTracksMutation,
  ExploreTracksDocument,
  FeedDocument,
  Genre,
  PendingRequest,
  PostsDocument,
  Track,
  TrackComponentFieldsFragment,
  TracksDocument,
  TracksQuery,
  useCreateMultipleTracksMutation,
  useCreateTrackEditionMutation,
  useCreateTrackWithScidMutation,
  usePinJsonToIpfsMutation,
  usePinToIpfsMutation,
} from 'lib/graphql'
import { imageMimeTypes } from 'lib/mimeTypes'
import * as musicMetadata from 'music-metadata-browser'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Metadata } from 'types/NftTypes'
import { genres } from 'utils/Genres'
import { MintingDone } from './MintingDone'

export const BATCH_SIZE = 120

// Retry utility for RPC rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isRateLimitError = (error: any): boolean => {
  const errorStr = error?.message || error?.toString() || ''
  return errorStr.includes('rate limit') ||
         errorStr.includes('Too many requests') ||
         errorStr.includes('429') ||
         errorStr.includes('-32603')
}

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 10000
): Promise<T> => {
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (isRateLimitError(error) && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt) // Exponential backoff
        console.log(`Rate limited, retrying in ${delay/1000}s (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
      } else {
        throw error
      }
    }
  }
  throw lastError
}

enum Tabs {
  NFT = 'NFT',
  SCID = 'SCid',
  POST = 'Post',
}

export const CreateModal = () => {
  const modalState = useModalState()
  const { asPath } = useRouter()
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch()
  const me = useMe()
  const [tab, setTab] = useState(Tabs.NFT)
  const { setIsMintingState } = useHideBottomNavBar()

  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()
  const [artworkPreview, setArtworkPreview] = useState<string>()

  const [newTrack, setNewTrack] = useState<CreateMultipleTracksMutation['createMultipleTracks']['firstTrack']>()

  const { upload } = useUpload()
  const [createMultipleTracks] = useCreateMultipleTracksMutation()
  const [createTrackEdition] = useCreateTrackEditionMutation()
  const [createTrackWithSCid] = useCreateTrackWithScidMutation()

  const { web3, account } = useWalletContext()
  const [pinToIPFS] = usePinToIpfsMutation()
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation()

  const { createEdition, mintNftTokensToEdition } = useBlockchainV2()
  const [transactionHash, setTransactionHash] = useState<string>()
  const [mintingState, setMintingState] = useState<string>()
  const [mintError, setMintError] = useState<boolean>(false)

  const [initialValues, setInitialValues] = useState<InitialValues>()
  const [scidResult, setScidResult] = useState<{
    trackId: string
    scid: string
    ipfsCid: string
    chainCode?: string
  } | null>(null)

  useEffect(() => {
    handleClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asPath])

  // Handle tab parameter from modal dispatch - if 'post' is requested, immediately open PostModal
  useEffect(() => {
    if (modalState.showCreate && modalState.createModalTab === 'post') {
      dispatchShowCreateModal(false)
      dispatchShowPostModal(true)
    }
  }, [modalState.showCreate, modalState.createModalTab, dispatchShowCreateModal, dispatchShowPostModal])

  const handleFileDrop = (file: File) => {
    musicMetadata.parseBlob(file).then(({ common: fileMetadata }) => {
      let artworkFile
      if (fileMetadata?.picture?.length) {
        const type = fileMetadata.picture[0].format
        const blob = new Blob([fileMetadata.picture[0].data], {
          type,
        })
        artworkFile = new File([blob], 'artwork', { type })
        setArtworkPreview(URL.createObjectURL(artworkFile))
      }

      let initialGenres
      if (fileMetadata.genre && fileMetadata.genre.length) {
        initialGenres = genres.filter(genre => fileMetadata.genre?.includes(genre.label)).map(genre => genre.key)
      }

      setInitialValues({
        title: fileMetadata?.title,
        description: fileMetadata?.comment && fileMetadata.comment[0],
        album: fileMetadata?.album,
        releaseYear: fileMetadata?.year,
        artworkFile: artworkFile,
        genres: initialGenres,
        copyright: fileMetadata?.license,
      })
    })
    setPreview(URL.createObjectURL(file))
    setArtworkPreview(undefined)
    setFile(file)
  }

  const isOpen = modalState.showCreate

  const handlePostTabClick = () => {
    dispatchShowCreateModal(false)
    dispatchShowPostModal(true)
  }

  const onCloseError = () => {
    setMintError(false)
    setMintingState(undefined)
  }

  const saveID3Tag = (values: FormValues, assetFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const bufferReader = new FileReader()
        bufferReader.readAsArrayBuffer(assetFile)
        bufferReader.addEventListener('loadend', async () => {
          const id3Writer = new ID3Writer(bufferReader.result)

          id3Writer
            .setFrame('TIT2', values.title)
            .setFrame('TPE1', [me?.handle])
            .setFrame('TALB', values.album)
            .setFrame('TYER', values.releaseYear)
            .setFrame('TCON', values.genres)
            .setFrame('WCOP', values.copyright)
            .setFrame('COMM', {
              description: 'Track description made by the author',
              text: values.description,
              language: 'eng',
            })

          if (values.artworkFile && imageMimeTypes.includes(values.artworkFile.type)) {
            const artWorkArrayBuffer = await values.artworkFile.arrayBuffer()
            id3Writer.setFrame('APIC', {
              type: 0,
              data: artWorkArrayBuffer,
              description: 'Artwork',
            })
          }
          id3Writer.addTag()
          const newFile: File = new File([id3Writer.getBlob()], assetFile.name, { type: assetFile.type })
          resolve(newFile)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // SCid upload handlers (no wallet required)
  const handleScidUploadAudio = async (file: File): Promise<string> => {
    return await upload([file])
  }

  const handleScidUploadArtwork = async (file: File): Promise<string> => {
    return await upload([file])
  }

  const handleScidSubmit = async (data: {
    title: string
    artist?: string
    album?: string
    description?: string
    releaseYear?: number
    copyright?: string
    genres?: string[]
    assetUrl: string
    artworkUrl?: string
  }) => {
    const result = await createTrackWithSCid({
      variables: {
        input: {
          title: data.title,
          description: data.description,
          assetUrl: data.assetUrl,
          artworkUrl: data.artworkUrl,
          artist: data.artist,
          album: data.album,
          releaseYear: data.releaseYear,
          copyright: data.copyright,
          genres: data.genres as Genre[] | undefined,
          createPost: false,
        },
      },
      refetchQueries: [FeedDocument, PostsDocument, ExploreTracksDocument],
    })

    const trackData = result.data?.createTrackWithSCid
    if (!trackData) {
      throw new Error('Failed to create track')
    }

    setScidResult({
      trackId: trackData.track.id,
      scid: trackData.scid?.scid || '',
      ipfsCid: trackData.track.ipfsCid || '',
      chainCode: trackData.scid?.chainCode,
    })

    return {
      trackId: trackData.track.id,
      scid: trackData.scid?.scid || '',
      message: trackData.message,
      ipfsCid: trackData.track.ipfsCid || '',
      ipfsGatewayUrl: trackData.track.ipfsGatewayUrl || '',
      chainCode: trackData.scid?.chainCode,
    }
  }

  const handleSubmit = async (values: FormValues) => {
    if (file && web3 && account && me) {
      const {
        title,
        artworkFile,
        description,
        utilityInfo,
        album,
        genres,
        releaseYear,
        copyright,
        royalty,
        editionQuantity,
        ISRC,
      } = values
      const artist = me.handle
      const artistId = me.id
      const artistProfileId = me.profile.id

      let asset = file
      if (file.type === 'audio/mpeg') {
        // only to MP3 files
        setMintingState('Writing data to ID3Tag ')
        asset = await saveID3Tag(values, file)
      }
      setMintingState('Uploading track file')
      const assetUrl = await upload([asset])

      try {
        const assetKey = assetUrl.substring(assetUrl.lastIndexOf('/') + 1)
        setMintingState('Pinning track to IPFS')
        const { data: assetPinResult } = await pinToIPFS({
          variables: {
            input: {
              fileKey: assetKey,
              fileName: values.title,
            },
          },
        })

        const metadataAttributes: Metadata['attributes'] = [{ trait_type: 'Artist', value: artist }]

        if (album) {
          metadataAttributes.push({ trait_type: 'Album', value: album })
        }

        if (releaseYear) {
          metadataAttributes.push({ trait_type: 'Release Year', value: releaseYear.toString() })
        }

        if (genres) {
          metadataAttributes.push({ trait_type: 'Genre', value: genres.join(', ') })
        }

        const metadata: Metadata = {
          description,
          name: title,
          asset: `ipfs://${assetPinResult?.pinToIPFS.cid}`,
          animation_url: `ipfs://${assetPinResult?.pinToIPFS.cid}`,
          album,
          artist,
          releaseYear,
          genres,
          ISRC,
          attributes: metadataAttributes,
        }

        let artworkUrl: string
        if (artworkFile) {
          setMintingState('Uploading track file')
          artworkUrl = await upload([artworkFile])

          const artPin = artworkUrl.substring(artworkUrl.lastIndexOf('/') + 1)
          setMintingState('Pinning artwork to IPFS')
          const { data: artPinResult } = await pinToIPFS({
            variables: {
              input: {
                fileKey: artPin,
                fileName: `${title}-art`,
              },
            },
          })
          metadata.art = `ipfs://${artPinResult?.pinToIPFS.cid}`
          metadata.image = `ipfs://${artPinResult?.pinToIPFS.cid}`
        }

        const { data: metadataPinResult } = await pinJsonToIPFS({
          variables: {
            input: {
              fileName: `${title}-metadata`,
              json: metadata,
            },
          },
        })

        const onError = (cause: Error) => {
          console.error('Error on minting', cause)
          setTransactionHash(undefined)
          // Check if it's a rate limit error
          const errorStr = cause?.message || cause?.toString() || ''
          if (errorStr.includes('rate limit') || errorStr.includes('Too many requests')) {
            setMintingState('Rate limited by RPC. Please wait 30 seconds and try again.')
          } else {
            setMintingState('There was an error while minting your NFT')
          }
          setMintError(true)
        }

        let nonce = await web3?.eth.getTransactionCount(account)

        const createAndMintEdition = (): Promise<Array<string>> => {
          return new Promise((resolve, reject) => {
            createEdition(account, account, royalty, editionQuantity, Number(nonce)) // Convert bigint to number
              .onReceipt(async receipt => {
                if (!receipt.status) {
                  reject('FAIL')
                }
                setMintingState('Creating your Edition')
                const editionCreated = receipt.events?.['EditionCreated']
                const { data } = await createTrackEdition({
                  variables: {
                    input: {
                      editionId: Number(editionCreated?.returnValues.editionNumber),
                      transactionHash: receipt.transactionHash,
                      editionSize: values.editionQuantity,
                      editionData: {
                        pendingRequest: PendingRequest.Mint,
                        pendingTime: new Date().toISOString(),
                        owner: account,
                        transactionHash: receipt.transactionHash,
                      },
                    },
                  },
                })
                const trackEditionId = data?.createTrackEdition.trackEdition.id
                resolve([editionCreated?.returnValues.editionNumber, trackEditionId, receipt.transactionHash])
              })
              .onError(cause => {
                onError(cause)
                reject(cause)
              })
              .execute(web3)
          })
        }

        const createAndMintTracks = (
          quantity: number,
          editionNumber: string,
          createPost: boolean,
        ): Promise<TrackComponentFieldsFragment | undefined> => {
          return new Promise((resolve, reject) => {
            mintNftTokensToEdition(
              `ipfs://${metadataPinResult?.pinJsonToIPFS.cid}`,
              account,
              account,
              Number(editionNumber),
              quantity,
              Number(nonce), // Convert bigint to number
            )
              .onReceipt(async receipt => {
                setMintingState('Creating your track')
                const { data } = await createMultipleTracks({
                  variables: {
                    input: {
                      batchSize: quantity,
                      createPost,
                      track: {
                        assetUrl,
                        title,
                        album,
                        artist,
                        artistId,
                        artworkUrl,
                        description,
                        genres,
                        ISRC,
                        releaseYear,
                        artistProfileId,
                        copyright,
                        trackEditionId,
                        utilityInfo,
                        nftData: {
                          transactionHash: receipt.transactionHash,
                          minter: account,
                          ipfsCid: metadataPinResult?.pinJsonToIPFS.cid,
                          pendingRequest: PendingRequest.Mint,
                          owner: account,
                          pendingTime: new Date().toISOString(),
                        },
                      },
                    },
                  },

                  update: (cache, { data: createMultipleTracksData }) => {
                    const variables = { filter: { nftData: { owner: account } } }

                    const cachedData = cache.readQuery<TracksQuery>({
                      query: TracksDocument,
                      variables,
                    })

                    if (!cachedData) {
                      return
                    }

                    const newTracks =
                      createMultipleTracksData?.createMultipleTracks.trackIds.map(
                        trackId =>
                          ({
                            ...createMultipleTracksData?.createMultipleTracks.firstTrack,
                            id: trackId,
                          } as Track),
                      ) || []

                    cache.writeQuery({
                      query: TracksDocument,
                      variables,
                      overwrite: true,
                      data: {
                        tracks: {
                          ...cachedData.tracks,
                          nodes: [...newTracks, ...cachedData.tracks.nodes],
                        },
                      },
                    })
                  },
                  refetchQueries: [FeedDocument, PostsDocument, ExploreTracksDocument],
                })
                resolve(data?.createMultipleTracks.firstTrack)
              })
              .onError(cause => {
                onError(cause)
                reject(cause)
              })
              .execute(web3)
          })
        }

        // Brief pause to let RPC rate limits recover after IPFS pinning
        setMintingState('Preparing blockchain transaction...')
        await sleep(3000)

        // Collect platform fee before minting (supports OGUN rewards)
        const platformFee = values.editionQuantity * config.mintFeePerNft
        if (platformFee > 0 && config.treasuryAddress) {
          setMintingState(`Collecting platform fee (${platformFee.toFixed(4)} POL)...`)
          try {
            const feeInWei = web3.utils.toWei(platformFee.toString(), 'ether')
            const gasPriceWei = await web3.eth.getGasPrice()
            const gasPrice = Math.floor(Number(gasPriceWei) * 1.2) // 20% buffer

            await web3.eth.sendTransaction({
              from: account,
              to: config.treasuryAddress,
              value: feeInWei,
              gas: 21000, // Standard ETH transfer gas
              gasPrice: gasPrice.toString(),
            })
            console.log(`Platform fee of ${platformFee} POL sent to treasury`)
          } catch (feeError: any) {
            console.error('Platform fee collection failed:', feeError)
            // If fee collection fails, we still proceed with minting
            // This prevents blocking users but logs the issue
            if (feeError?.code === 4001 || feeError?.message?.includes('User denied')) {
              // User rejected the fee transaction
              setMintingState('Platform fee rejected. Please approve to continue.')
              setMintError(true)
              return
            }
          }
        }

        setMintingState('Minting Edition')

        // Wrap with retry for RPC rate limiting
        const [editionNumber, trackEditionId, trackEditionTransactionHash] = await withRetry(
          () => createAndMintEdition(),
          3,
          10000
        )

        let quantityLeft = values.editionQuantity
        const promises = []
        for (let index = 0; index < values.editionQuantity; index += BATCH_SIZE) {
          nonce = BigInt(await web3?.eth.getTransactionCount(account)) // Update nonce for each batch
          const quantity = quantityLeft <= BATCH_SIZE ? quantityLeft : BATCH_SIZE
          // Wrap with retry for RPC rate limiting
          promises.push(withRetry(() => createAndMintTracks(quantity, editionNumber, index === 0), 3, 10000))
          setMintingState('Minting NFT')

          quantityLeft = quantityLeft - BATCH_SIZE
        }
        const [firstTrack] = await Promise.all(promises)
        setNewTrack(firstTrack)
        dispatchShowCreateModal(true)
        setMintingState(undefined)
        setTransactionHash(trackEditionTransactionHash)
      } catch (e) {
        console.error(e)
        setTransactionHash(undefined)
        setMintingState('There was an error while minting your NFT')
        setMintError(true)
      }
    }
  }

  const handleClose = () => {
    dispatchShowCreateModal(false)
    if (!mintingState) {
      setTransactionHash(undefined)
      setFile(undefined)
      setScidResult(null)
    }
  }

  useEffect(() => {
    mintingState?.length ? setIsMintingState(true) : setIsMintingState(false)
  }, [mintingState, setIsMintingState])

  const tabs = (
    <div className="flex rounded-lg bg-gray-10">
      <button
        onClick={() => setTab(Tabs.NFT)}
        className={classNames(
          'flex-1 rounded-lg py-1.5 text-sm font-bold',
          tab === Tabs.NFT ? 'bg-gray-30 text-white' : 'text-gray-80',
        )}
      >
        Mint NFT
      </button>
      <button
        onClick={() => setTab(Tabs.SCID)}
        className={classNames(
          'flex-1 rounded-lg py-1.5 text-sm font-bold',
          tab === Tabs.SCID ? 'bg-gray-30 text-white' : 'text-gray-80',
        )}
      >
        SCid
      </button>
      <button
        onClick={handlePostTabClick}
        className={classNames(
          'flex-1 rounded-lg py-1.5 text-sm font-bold',
          tab === Tabs.POST ? 'bg-gray-30 text-white' : 'text-gray-80',
        )}
      >
        Post
      </button>
    </div>
  )

  return (
    <Modal
      show={isOpen}
      title={tabs}
      onClose={handleClose}
      leftButton={
        <button className="w-full flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleClose}>
          Close
        </button>
      }
    >
      {tab === Tabs.SCID ? (
        /* SCid Certificate Upload - No wallet required */
        scidResult ? (
          <div className="p-6 text-center">
            <div className="mb-4 text-4xl">🎉</div>
            <h3 className="mb-2 text-xl font-bold text-white">Track Uploaded!</h3>
            <p className="mb-4 text-gray-400">Your SCid certificate has been generated.</p>
            <div className="mb-4 rounded-lg bg-gray-800 p-4 text-left">
              <p className="text-sm text-gray-400">SCid:</p>
              <p className="font-mono text-cyan-400 break-all">{scidResult.scid}</p>
              {scidResult.chainCode && (
                <>
                  <p className="mt-2 text-sm text-gray-400">Chain Code:</p>
                  <p className="font-mono text-cyan-400">{scidResult.chainCode}</p>
                </>
              )}
              <p className="mt-2 text-sm text-gray-400">IPFS CID:</p>
              <p className="font-mono text-cyan-400 break-all">{scidResult.ipfsCid}</p>
            </div>
            <Button variant="rainbow-xs" onClick={() => setScidResult(null)}>
              Upload Another
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-center text-sm text-green-400 font-bold mb-1">
                FREE Upload
              </p>
              <p className="text-center text-xs text-gray-400">
                No wallet needed. Get an SCid certificate as proof of ownership.
              </p>
              <p className="text-center text-xs text-gray-500 mt-2">
                Earns OGUN rewards • NFT mints earn 2x rewards
              </p>
            </div>
            <SimpleTrackUploadForm
              onUploadAudio={handleScidUploadAudio}
              onUploadArtwork={handleScidUploadArtwork}
              onSubmit={handleScidSubmit}
            />
          </div>
        )
      ) : transactionHash && newTrack ? (
        <MintingDone transactionHash={transactionHash} track={newTrack} />
      ) : (
        <>
          <div className="px-4 py-4">
            <TrackUploader onFileChange={handleFileDrop} art={artworkPreview} />
          </div>
          {file && preview && <TrackMetadataForm handleSubmit={handleSubmit} initialValues={initialValues} />}
          {mintingState && (
            <div className="absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center bg-gray-20 bg-opacity-80">
              <Image
                height={200}
                width={200}
                src={mintError ? '/nyan-cat-dead.png' : '/nyan-cat-rainbow.gif'}
                alt="Loading"
                priority
              />
              <div className="mt-4 text-center text-lg font-bold text-white">{mintingState}</div>
              {mintError && (
                <Button variant="rainbow-xs" onClick={onCloseError} className="mt-4">
                  CANCEL
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

export default CreateModal
