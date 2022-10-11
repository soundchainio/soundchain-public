import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { Badge, MeDocument, MeQuery, useClaimBadgeProfileMutation } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

interface ClaimBadgeProfileProps {
  me?: MeQuery['me']
}

export const getServerSideProps: GetServerSideProps<ClaimBadgeProfileProps> = async context => {
  const apolloClient = createApolloClient(context)

  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  })

  return cacheFor(ClaimBadgeProfilePage, { me: data.me }, context, apolloClient)
}

export default function ClaimBadgeProfilePage({}: ClaimBadgeProfileProps) {
  const me = useMe()
  const router = useRouter()
  const [claimBadgeProfileMutation, { loading, error }] = useClaimBadgeProfileMutation()

  useEffect(() => {
    if (!me)
      router.push({
        pathname: '/login',
        query: { callbackUrl: router.pathname },
      })

    const claimBadge = async () => {
      await claimBadgeProfileMutation()
    }
    if (!me?.profile.badges?.includes(Badge.SupporterFirstEventAeSc)) claimBadge()
  }, [me, router, claimBadgeProfileMutation])

  return (
    <>
      <SEO
        title="Claim Your Badge | Soundchain"
        canonicalUrl="/claim-badge-profile/"
        description="Soundchain Claim Badge"
      />
      {loading && (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
          <div className="pl-3 text-sm font-bold text-white">Claiming Your Badge</div>
        </div>
      )}
      {!loading && me?.profile.badges?.includes(Badge.SupporterFirstEventAeSc) && !error && (
        <>
          <div className="-mt-16 flex h-full w-full flex-col items-center justify-center">
            <Image alt="badge" src={'/badges/badge-01.svg'} width={'100%'} height={'100%'} />
            <div className="mt-3 pl-3 text-sm font-bold text-white">Badge Claimed !!!</div>
          </div>
        </>
      )}
      {error && (
        <div className="flex items-center justify-center">
          <div className="pl-3 text-sm font-bold text-white">Sorry we couldn&apos;t claim your badge now</div>
        </div>
      )}
    </>
  )
}
