import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { MeDocument, MeQuery, useClaimBadgeProfileMutation } from 'lib/graphql'
import { GetServerSideProps } from 'next'
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
  const [claimBadgeProfileMutation, { data, loading, error }] = useClaimBadgeProfileMutation()

  useEffect(() => {
    if (!me) router.push('/login')

    const claimBadge = async () => {
      await claimBadgeProfileMutation()
    }

    claimBadge()
  }, [me, router, claimBadgeProfileMutation])

  return (
    <>
      <SEO
        title="Claim Your Badge | Soundchain"
        canonicalUrl="/claim-badge-profile/"
        description="Soundchain Claim Badge"
      />
      {loading && (
        <div className=" flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
          <div className="pl-3 text-sm font-bold text-white">Claiming Your Badge</div>
        </div>
      )}
      {!loading && data?.claimBadgeProfile.profile && !error && (
        <div className=" flex items-center justify-center">
          <div className="pl-3 text-sm font-bold text-white">Badge Claimed !!!</div>
        </div>
      )}
      {error && (
        <div className=" flex items-center justify-center">
          <div className="pl-3 text-sm font-bold text-white">Sorry we couldn`&apos;`t claim your badge now</div>
        </div>
      )}
    </>
  )
}
