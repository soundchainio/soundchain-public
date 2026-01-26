import { useEffect, useState } from 'react'

    import { Button } from 'components/common/Buttons/Button'
    import { TOKEN_ADDRESSES, QUICKSWAP_SWAP_URL } from 'constants/tokens'
    import { WalletButton } from 'components/common/Buttons/WalletButton'
    import { LoaderAnimation } from 'components/LoaderAnimation'
    import SEO from 'components/SEO'
    import { config } from 'config'
    import { useLayoutContext } from 'hooks/useLayoutContext'
    import { useMagicContext } from 'hooks/useMagicContext'
    import { MetaMask } from 'icons/MetaMask'
    import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
    import { WalletConnect } from 'icons/WalletConnect'
    import {
      useAudioHolderByWalletLazyQuery,
      useProofBookByWalletLazyQuery,
      useUpdateOgunClaimedAudioHolderMutation,
      useUpdateOgunClaimedWhitelistMutation,
      useWhitelistEntryByWalletLazyQuery,
    } from 'lib/graphql'
    import { RPCErrorCode } from 'magic-sdk'
    import Link from 'next/link'
    import { useRouter } from 'next/router'
    import { toast, ToastContainer } from 'react-toastify'
    import { errorHandler } from 'utils/errorHandler'
    import Web3 from 'web3'

    /* eslint-disable @typescript-eslint/no-explicit-any */
    import WalletConnectProvider from '@walletconnect/web3-provider'

    import { CustomModal } from '../components/CustomModal'
    import useBlockchainV2 from '../hooks/useBlockchainV2'

    export default function AirdropPage() {
      const router = useRouter()
      const { web3: magicLinkWeb3, account: magicLinkAccount } = useMagicContext()
      const { setIsLandingLayout } = useLayoutContext()
      const [proofBookByWallet, { data: proofBook, loading: loadingProof }] = useProofBookByWalletLazyQuery({
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'network-only',
      })
      const [whitelistEntryByWallet, { data: whitelistEntry }] = useWhitelistEntryByWalletLazyQuery()
      const [audioHolderByWallet, { data: audioHolder }] = useAudioHolderByWalletLazyQuery()
      const [updateOgunClaimedWhitelist] = useUpdateOgunClaimedWhitelistMutation()
      const [updateOgunClaimedAudioHolder] = useUpdateOgunClaimedAudioHolderMutation()
      const [account, setAccount] = useState('')
      const [showModal, setShowModal] = useState(false)
      const [loading, setLoading] = useState(false)
      const [closeModal, setCloseModal] = useState(true)
      const [isClaimed, setIsClaimed] = useState(false)
      const [web3, setWeb3] = useState<Web3>()

      const { claimOgun, hasClaimedOgun } = useBlockchainV2()

      const isAudiusHolder = Boolean(audioHolder)
      const isWhitelistUser = Boolean(whitelistEntry)
      const isAddressInProofBook = Boolean(proofBook?.getProofBookByWallet?.address)

      useEffect(() => {
        if (account) {
          whitelistEntryByWallet({ variables: { walletAdress: account } })
          audioHolderByWallet({ variables: { walletAdress: account } })
          proofBookByWallet({ variables: { walletAddress: account } })
        }
      }, [account, audioHolderByWallet, whitelistEntryByWallet, proofBookByWallet])

      useEffect(() => {
        setIsLandingLayout(true)

        return () => {
          setIsLandingLayout(false)
        }
      }, [setIsLandingLayout])

      const provider: any = new WalletConnectProvider({
        rpc: {
          1: 'https://cloudflare-eth.com/',
          137: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com',
        },
      })

      const connectWC = async () => {
        setLoading(true)
        try {
          await provider.enable()
          const web3 = new Web3(provider)
          const accounts = await web3.eth.getAccounts()
          if (accounts) setAccount(accounts[0])
          const isClaimed = await handleIsClaimed(web3, accounts[0])
          if (isClaimed) setIsClaimed(true)
          setWeb3(web3)
        } catch (error) {
          setCloseModal(!closeModal)
          console.warn('warn: ', error)
        }
        setLoading(false)
      }

      const successfullyClaimedOguns = 'OGUNs claimed successfully!'

      const handleErrorClaimingOgun = (error?: any) => {
        if (!error) return
        if (error.code === RPCErrorCode.InternalError) {
          toast.error('An error has occurred. Please ensure you have enough Matic to complete the transaction.')
          return setLoading(false)
        }
        const genericErrorMessage = 'Unfortunately, we could not claim your OGUNs at this moment. Try again later.'
        toast.error(genericErrorMessage)
        errorHandler(error)
        return setLoading(false)
      }

      const connectMetaMask = async () => {
        try {
          const { ethereum } = window
          if (!ethereum) return toast.error('Please install the Metamask extension in your browser')
          const provider = ethereum
          await provider.request({ method: 'eth_requestAccounts' })
          const web3API = new Web3(provider)
          const [account] = await web3API.eth.getAccounts()
          const isClaimed = await handleIsClaimed(web3API, account)
          if (isClaimed) setIsClaimed(true)
          setAccount(account)
          setWeb3(web3API)
        } catch (error) {
          toast.error('An error has occurred. Try again later.')
          console.error(error)
        } finally {
          setCloseModal(!closeModal)
        }
      }

      const connectSoundchain = () => {
        if (!magicLinkWeb3 || !magicLinkAccount) return router.push(`/login?callbackUrl=${parent.location.href}`)
        setShowModal(false)
        setAccount(magicLinkAccount)
        setWeb3(magicLinkWeb3)
      }

      const handleIsClaimed = async (web3: Web3, address: string) => {
        const contract = hasClaimedOgun(address)
        const hasClaimedContract = await contract.execute(web3)
        const isWhitelistClaimedDatabase = whitelistEntry?.whitelistEntryByWallet.ogunClaimed
        const isAudiusHolderClaimedDatabase = audioHolder?.audioHolderByWallet.ogunClaimed
        return hasClaimedContract || isWhitelistClaimedDatabase || isAudiusHolderClaimedDatabase
      }

      const handleClaimOgun = () => {
        setLoading(true)
        const from = proofBook?.getProofBookByWallet?.address
        const to = proofBook?.getProofBookByWallet?.address
        const amount = proofBook?.getProofBookByWallet?.value
        const proof = proofBook?.getProofBookByWallet?.merkleProof

        if (!from || !to || !amount || !proof || !web3) return handleErrorClaimingOgun()

        const contract = claimOgun(from, to, amount, proof)
        contract
          .onReceipt(() => handleClaimOnSuccess())
          .onError(error => handleErrorClaimingOgun(error))
          .finally(() => setLoading(false))
          .execute(web3)
          .catch(error => handleErrorClaimingOgun(error))
      }

      const handleClaimOnSuccess = async () => {
        toast.success(successfullyClaimedOguns)
        const whiteListEntryId = whitelistEntry?.whitelistEntryByWallet.id || ''
        const audiusHolderId = audioHolder?.audioHolderByWallet.id || ''
        setIsClaimed(true)

        try {
          if (whiteListEntryId) {
            await updateOgunClaimedWhitelist({ variables: { input: { id: whiteListEntryId, ogunClaimed: true } } })
          }
          if (audiusHolderId) {
            await updateOgunClaimedAudioHolder({ variables: { input: { id: audiusHolderId, ogunClaimed: true } } })
          }
        } catch (error) {
          console.error(error)
        }
      }

      const ConnectAccountState = () => {
        return (
          <>
            <CustomModal show={showModal} onClose={() => setShowModal(false)}>
              <div className="w-96 rounded bg-white p-6">
                <h1 className="text-2xl font-bold text-blue-500">CONNECT WALLET</h1>
                <p className="py-1 text-gray-500">Connect with one of our available wallet providers</p>
                <div className="my-4 space-y-3">
                  <WalletButton caption="Soundchain" icon={SoundchainGoldLogo} handleOnClick={connectSoundchain} />
                  <WalletButton caption="Metamask" icon={MetaMask} handleOnClick={connectMetaMask} />
                  <WalletButton caption="WalletConnect" icon={WalletConnect} handleOnClick={connectWC} />
                </div>
              </div>
            </CustomModal>
            <div>
              <h1 className="text-center text-2xl font-extrabold md:text-5xl">
                Connect your <span className="green-blue-gradient-text-break">wallet</span>
              </h1>
              <h2 className="pt-6 text-center text-xl font-light md:text-4xl">
                If you were an existing SoundChain user,
                <br />
                joined the whitelist, or had any AUDIO when
                <br />
                we took a snapshot on August 30th, connect
                <br />
                your wallet to claim up to <span className="yellow-gradient-text font-bold">5,000 OGUN</span>
              </h2>
            </div>
            <Button variant="rainbow" className="w-5/6" onClick={() => setShowModal(true)}>
              <span className="font-medium ">CONNECT</span>
            </Button>
          </>
        )
      }

      const WhitelistState = () => {
        return (
          <>
            <div>
              <h1 className="text-center text-2xl font-extrabold md:text-5xl">
                Connect your <span className="green-blue-gradient-text-break">wallet</span>
              </h1>
              <h2 className="pt-6 text-center text-xl font-light md:text-4xl">
                If you are an existing SoundChain user,
                <br />
                joined the whitelist, or had any AUDIO when
                <br />
                we took a snapshot on August 30th, connect
                <br />
                your wallet to claim up to <span className="yellow-gradient-text font-bold">5,000 OGUN</span>
              </h2>
            </div>
            <Button variant="rainbow" className="w-5/6" loading={loading} onClick={handleClaimOgun}>
              <span className="font-medium ">CLAIM</span>
            </Button>
          </>
        )
      }

      const getClaimableAmount = () => {
        const amount = proofBook?.getProofBookByWallet?.value
        if (!amount) return

        const convertedAmount = Web3.utils.fromWei(amount, 'ether')
        return Number(convertedAmount).toFixed(2)
      }

      const AudioHolderState = () => {
        return (
          <>
            <h2 className="text-center text-2xl font-light md:text-4xl">
              Based on how much AUDIO you own, you are able to claim this much OGUN
            </h2>
            <h2 className="flex flex-col items-center whitespace-pre-wrap text-center text-2xl font-medium md:flex-row md:text-4xl">
              <span>
                {getClaimableAmount()}
                &nbsp;
                <span className="green-blue-gradient-text-break">OGUN</span>
              </span>
            </h2>
            <Button variant="rainbow" className="w-5/6" loading={loading} onClick={handleClaimOgun}>
              <span className="font-medium ">CLAIM</span>
            </Button>
          </>
        )
      }

      const WithoutAudioState = () => {
        return (
          <h2 className="pt-6 text-center text-2xl font-light md:text-4xl">
            Sorry, you didn&#39;t have enough AUDIO at the time of the Airdrop. You can earn some OGUN by trading on the
            platform or through some other methods.{' '}
            <Link href="/" className="green-blue-gradient-text-break font-medium">
              Learn more here.
            </Link>
          </h2>
        )
      }

      const ClaimedState = () => {
        return (
          <>
            <h2 className="text-center text-2xl font-light md:text-4xl">
              You have already claimed your <span className="green-blue-gradient-text-break">OGUN</span>
            </h2>
            <Link href="/explore" passHref>
              <Button variant="rainbow" className="w-5/6">
                <span className="font-medium ">EXPLORE</span>
              </Button>
            </Link>
          </>
        )
      }

      const quickSwapLink = QUICKSWAP_SWAP_URL(TOKEN_ADDRESSES.MATIC, TOKEN_ADDRESSES.OGUN)

      const ClosedState = () => {
        return (
          <>
            <h2 className="pt-6 text-center text-2xl font-light md:text-4xl">
              Sorry, the Airdrop is closed. You can{' '}
              <Link href={quickSwapLink}>
                <a className="green-blue-gradient-text-break font-medium">get OGUN here.</a>
              </Link>
            </h2>
          </>
        )
      }

      return (
        <>
          <ToastContainer
            position="top-center"
            autoClose={6 * 1000}
            toastStyle={{
              backgroundColor: '#202020',
              color: 'white',
              fontSize: '12px',
              textAlign: 'center',
            }}
          />
          <SEO title="Airdrop" canonicalUrl="/airdrop" description="Collect your Ogun tokens" />
          <main className="flex h-full w-full items-center justify-center py-32 font-rubik text-white">
            <div className="flex max-w-3xl flex-col items-center justify-center gap-y-12 pb-0 md:pb-40">
              {!config.airdropStatus ? (
                <ClosedState />
              ) : !account ? (
                <ConnectAccountState />
              ) : loading || loadingProof ? (
                <LoaderAnimation loadingMessage="Loading" />
              ) : isClaimed ? (
                <ClaimedState />
              ) : isAddressInProofBook && isWhitelistUser && !isClaimed ? (
                <WhitelistState />
              ) : isAddressInProofBook && isAudiusHolder && !isClaimed ? (
                <AudioHolderState />
              ) : (
                <WithoutAudioState />
              )}
            </div>
          </main>
        </>
      )
    }
