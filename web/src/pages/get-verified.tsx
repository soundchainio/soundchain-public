import { Button } from 'components/common/Buttons/Button'
import { CopyLink } from 'components/CopyLink'
import { FormValues, RequestVerificationForm } from 'components/RequestVerificationForm'
import SEO from 'components/SEO'
import { format as formatTimestamp } from 'date-fns'
import { useMe } from 'hooks/useMe'
import { Verified } from 'icons/Verified'
import { cacheFor } from 'lib/apollo'
import {
  ProfileVerificationRequest,
  ProfileVerificationStatusType,
  useCreateProfileVerificationRequestMutation,
  useProfileVerificationRequestQuery,
  useRemoveProfileVerificationRequestMutation,
} from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(GetVerified, {}, context, apolloClient)
})

export default function GetVerified() {
  const [createRequestVerification] = useCreateProfileVerificationRequestMutation()
  const [removeRequestVerification] = useRemoveProfileVerificationRequestMutation()
  const { data: request } = useProfileVerificationRequestQuery()
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState<ProfileVerificationRequest>()
  const [myProfileLink, setMyProfileLink] = useState('')
  const me = useMe()

  const handleSubmit = async (values: FormValues) => {
    if (values.soundcloud || values.youtube || values.bandcamp) {
      setLoading(true)
      const req = await createRequestVerification({ variables: { input: values } })
      setRequested(req.data?.createProfileVerificationRequest.profileVerificationRequest)
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (requested) {
      await removeRequestVerification({ variables: { id: requested.id } })
      setRequested(undefined)
    }
  }

  useEffect(() => {
    setMyProfileLink(`${window.location.origin}/profiles/${me?.handle}`)
  }, [me])

  useEffect(() => {
    if (request?.profileVerificationRequest.id) setRequested(request.profileVerificationRequest)
  }, [request])

  return (
    <>
      <SEO
        title="Get Verified | SoundChain"
        description="Request your profile verification"
        canonicalUrl="/get-verified/"
      />
      <div className="flex w-full items-center justify-center px-4 py-10 text-center font-bold text-white">
        Receive a blue checkmark <Verified className="ml-4 scale-150" />
      </div>
      {!requested && (
        <>
          <div className="px-4 pb-10 text-center text-sm text-gray-400">
            In order to get verified on the SoundChain platform, please submit at least one of the following:
          </div>
          <ol className="space-y-4 text-sm text-gray-300">
            <li className="px-4 font-bold text-white">1. Copy your SoundChain profile link:</li>
            <CopyLink link={myProfileLink} />
            <li className="px-4 font-bold text-white">
              2. Add your SoundChain link to the socials on at least one of the following platforms:
              <RequestVerificationForm loading={loading} handleSubmit={handleSubmit} />
            </li>
          </ol>
        </>
      )}
      {requested?.status === ProfileVerificationStatusType.Pending && (
        <div className="px-4 pb-10 text-center text-sm text-gray-400">
          Your request has been sent!
          <div className="mt-6 mb-6">
            {formatTimestamp(new Date(requested.createdAt), 'MM-dd-yyyy')} at{' '}
            {formatTimestamp(new Date(requested.createdAt), "hh:mmaaaaa'm'")}
          </div>
          <div className="mt-6 mb-6">You will get notified when we review the information you submitted.</div>
          <Image alt="Status: Pending" height="100" width="100" className="animate-spin" src="/vinyl-record.png" />
        </div>
      )}

      {requested?.status === ProfileVerificationStatusType.Approved && (
        <div className="px-4 pb-10 text-center text-sm text-gray-400">Your account is legitimate!</div>
      )}

      {requested?.status === ProfileVerificationStatusType.Denied && (
        <div className="px-4 pb-10 text-center text-sm text-gray-400">
          Your request was <span className="font-bold text-red-500">DENIED</span>.
          <div className="mt-5">Reason: {requested.reason}</div>
          <div className="mt-5 flex items-center">
            <Button
              variant="outline"
              borderColor="bg-green-gradient"
              className="mx-6 mt-5 h-12 w-full"
              onClick={handleResend}
            >
              RESEND THE FORM
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
