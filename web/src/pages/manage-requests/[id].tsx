import { useEffect, useState } from 'react'

import { Avatar } from 'components/Avatar'
import { Button } from 'components/common/Buttons/Button'
import { Delete as DeleteButton } from 'components/common/Buttons/Delete'
import { CurrentRequestStatus } from 'components/CurrentRequestStatus'
import { DenyReasonModal } from 'components/DenyReasonModal'
import { DisplayName } from 'components/DisplayName'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { Bandcamp } from 'icons/Bandcamp'
import { Soundcloud } from 'icons/Soundcloud'
import { Youtube } from 'icons/Youtube'
import { cacheFor } from 'lib/apollo'
import {
  ProfileVerificationRequest,
  ProfileVerificationRequestDocument,
  ProfileVerificationRequestsDocument,
  ProfileVerificationStatusType,
  Role,
  useProfileQuery,
  useUpdateProfileVerificationRequestMutation,
} from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'

export interface RequestPageProps {
  data: ProfileVerificationRequest
}

interface RequestPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps = protectPage<RequestPageProps, RequestPageParams>(async (context, apolloClient) => {
  const requestId: string | undefined = context.params?.id

  if (!requestId) {
    return { notFound: true }
  }

  const { data, error } = await apolloClient.query({
    query: ProfileVerificationRequestDocument,
    variables: { id: requestId },
    context,
  })

  if (!context.user?.roles.includes(Role.Admin)) return { notFound: true }

  if (error) {
    return { notFound: true }
  }

  return cacheFor(RequestPage, { data: data.profileVerificationRequest }, context, apolloClient)
})

const topNavBarProps: TopNavBarProps = {
  title: 'Verification Request',
}

export default function RequestPage({ data }: RequestPageProps) {
  const [showReason, setShowReason] = useState<boolean>(false)
  const { data: profile } = useProfileQuery({ variables: { id: data.profileId } })
  const [updateRequestVerification] = useUpdateProfileVerificationRequestMutation({
    fetchPolicy: 'network-only',
    refetchQueries: [ProfileVerificationRequestsDocument],
  })
  const me = useMe()
  const router = useRouter()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  if (!profile) return null

  const sourceList = [
    { name: 'SoundCloud', fieldName: 'soundcloud', icon: <Soundcloud className="h-7 w-7" />, link: data.soundcloud },
    { name: 'YouTube', fieldName: 'youtube', icon: <Youtube className="h-7 w-7" />, link: data.youtube },
    { name: 'BandCamp', fieldName: 'bandcamp', icon: <Bandcamp className="h-6 scale-50" />, link: data.bandcamp },
  ]

  const handleApprove = async () => {
    await updateRequestVerification({
      variables: {
        id: data.id,
        input: {
          reviewerProfileId: me?.profile.id,
          status: ProfileVerificationStatusType.Approved,
        },
      },
    })
    router.push('/manage-requests')
  }

  const handleDeny = () => {
    setShowReason(true)
  }

  return (
    <>
      <SEO title="Manage Request | SoundChain" canonicalUrl={router.asPath} description="SoundChain Manage Request" />
      <div className="flex h-full flex-col justify-between">
        <div>
          <NextLink href={`/profiles/${profile.profile.userHandle}`} passHref className="flex cursor-pointer flex-col text-white">
            <div className="relative flex items-center p-4">
              <Avatar profile={profile.profile} pixels={40} className="flex min-w-max items-center rounded-full" />
              <div className="mx-4">
                <DisplayName
                  name={profile.profile.displayName}
                  verified={profile.profile.verified}
                  teamMember={profile.profile.teamMember}
                  badges={profile.profile.badges}
                />
                <p className="text-sm text-gray-80">@{profile.profile.userHandle}</p>
              </div>
            </div>
          </NextLink>
          <CurrentRequestStatus reason={data.reason || ''} status={data.status as ProfileVerificationStatusType} />
          {sourceList.map(src => (
            <div key={src.name} className="my-8 flex items-center text-white">
              <div className="flex flex-col items-center justify-center  px-2 text-xs">
                <div className="flex w-20 flex-col items-center text-xs">{src.icon}</div>
                {src.name}
              </div>
              <a
                href={normalizeURL(src.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline"
              >
                {src.link}
              </a>
            </div>
          ))}
        </div>
        <div className="my-5 mt-auto flex items-center gap-4 px-4 md:px-0">
          {data.status !== ProfileVerificationStatusType.Denied && (
            <DeleteButton onClick={handleDeny} className="h-12 w-full text-sm text-white">
              {data.status === ProfileVerificationStatusType.Approved ? 'REMOVE VERIFICATION' : 'DENY'}
            </DeleteButton>
          )}
          {data.status !== ProfileVerificationStatusType.Approved && (
            <Button variant="outline" borderColor="bg-green-gradient" className="h-12 w-full" onClick={handleApprove}>
              APPROVE
            </Button>
          )}
        </div>
      </div>
      <DenyReasonModal showReason={showReason} setShowReason={setShowReason} requestId={data.id} />
    </>
  )
}

const normalizeURL = (url: string | undefined | null) => {
  if (!url) {
    return ''
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `https://${url}`
}
