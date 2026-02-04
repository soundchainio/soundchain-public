import { X } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { Profile, useFollowersLazyQuery, useFollowingLazyQuery } from 'lib/graphql'
import { useEffect } from 'react'
import { FollowModalType } from 'types/FollowModalType'
import { LoaderAnimation } from 'components/LoaderAnimation'
import Link from 'next/link'

interface FollowersModal {
  show: boolean
  profileId: string
  modalType: FollowModalType
  onClose: () => void
  compact?: boolean // New: compact grid mode for bio panel
}

export const FollowModal = ({ show, profileId, modalType, onClose, compact = false }: FollowersModal) => {
  const [followers, { data: followersData, fetchMore: fetchMoreFollowers, loading: followersLoading }] = useFollowersLazyQuery({
    variables: { profileId },
  })
  const [following, { data: followingData, fetchMore: fetchMoreFollowing, loading: followingLoading }] = useFollowingLazyQuery({
    variables: { profileId },
  })

  useEffect(() => {
    if (show) {
      if (modalType === FollowModalType.FOLLOWERS) {
        followers()
      } else {
        following()
      }
    }
  }, [show, modalType])

  const getTitle = () => {
    if (modalType === FollowModalType.FOLLOWERS) {
      return followersData ? `Followers (${followersData.followers.pageInfo.totalCount})` : `Followers`
    }
    return followingData ? `Following (${followingData.following.pageInfo.totalCount})` : `Following`
  }

  const profiles = modalType === FollowModalType.FOLLOWERS
    ? followersData?.followers.nodes.map(f => f.followerProfile as Profile) || []
    : followingData?.following.nodes.map(f => f.followedProfile as Profile) || []

  const isLoading = modalType === FollowModalType.FOLLOWERS ? followersLoading : followingLoading
  const hasData = modalType === FollowModalType.FOLLOWERS ? !!followersData : !!followingData

  if (!show) return null

  // Compact mode - small popover with avatar grid
  if (compact) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Compact Modal */}
        <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm animate-in zoom-in-95 duration-150">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-sm font-semibold text-white">{getTitle()}</span>
              <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {isLoading && !hasData && (
                <div className="flex items-center justify-center py-8">
                  <LoaderAnimation loadingMessage={`Loading ${modalType === FollowModalType.FOLLOWERS ? 'Followers' : 'Following'}`} />
                </div>
              )}

              {hasData && profiles.length === 0 && (
                <p className="text-center text-neutral-500 py-8">
                  {modalType === FollowModalType.FOLLOWERS ? 'No followers yet' : 'Not following anyone'}
                </p>
              )}

              {/* Avatar Grid */}
              {profiles.length > 0 && (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                  {profiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href={`/dex/users/${profile.userHandle}`}
                      onClick={onClose}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="relative">
                        <Avatar
                          linkToProfile={false}
                          pixels={48}
                          className="ring-2 ring-transparent group-hover:ring-cyan-500 transition-all"
                          profile={profile}
                        />
                        {profile.verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 group-hover:text-white truncate max-w-[48px] text-center transition-colors">
                        {profile.displayName?.split(' ')[0] || profile.userHandle}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Load More */}
              {((modalType === FollowModalType.FOLLOWERS && followersData?.followers.pageInfo.hasNextPage) ||
                (modalType === FollowModalType.FOLLOWING && followingData?.following.pageInfo.hasNextPage)) && (
                <button
                  onClick={() => {
                    if (modalType === FollowModalType.FOLLOWERS && fetchMoreFollowers) {
                      fetchMoreFollowers({ variables: { profileId, page: { after: followersData?.followers.pageInfo.endCursor } } })
                    } else if (fetchMoreFollowing) {
                      fetchMoreFollowing({ variables: { profileId, page: { after: followingData?.following.pageInfo.endCursor } } })
                    }
                  }}
                  className="w-full mt-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Load more...
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Full mode - original list layout (for profile pages)
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-sm font-semibold text-white">{getTitle()}</span>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {isLoading && !hasData && (
              <div className="flex items-center justify-center py-8">
                <LoaderAnimation loadingMessage={`Loading ${modalType === FollowModalType.FOLLOWERS ? 'Followers' : 'Following'}`} />
              </div>
            )}

            {hasData && profiles.length === 0 && (
              <p className="text-center text-neutral-500 py-8">
                {modalType === FollowModalType.FOLLOWERS ? 'No followers yet' : 'Not following anyone'}
              </p>
            )}

            {/* Avatar Grid - wider layout for full mode */}
            {profiles.length > 0 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-4">
                {profiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/dex/users/${profile.userHandle}`}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="relative">
                      <Avatar
                        linkToProfile={false}
                        pixels={52}
                        className="ring-2 ring-transparent group-hover:ring-cyan-500 transition-all"
                        profile={profile}
                      />
                      {profile.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 group-hover:text-white truncate max-w-[52px] text-center transition-colors">
                      {profile.displayName?.split(' ')[0] || profile.userHandle}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More */}
            {((modalType === FollowModalType.FOLLOWERS && followersData?.followers.pageInfo.hasNextPage) ||
              (modalType === FollowModalType.FOLLOWING && followingData?.following.pageInfo.hasNextPage)) && (
              <button
                onClick={() => {
                  if (modalType === FollowModalType.FOLLOWERS && fetchMoreFollowers) {
                    fetchMoreFollowers({ variables: { profileId, page: { after: followersData?.followers.pageInfo.endCursor } } })
                  } else if (fetchMoreFollowing) {
                    fetchMoreFollowing({ variables: { profileId, page: { after: followingData?.following.pageInfo.endCursor } } })
                  }
                }}
                className="w-full mt-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Load more...
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
