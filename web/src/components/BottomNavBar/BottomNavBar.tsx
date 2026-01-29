import { useModalDispatch } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home } from 'icons/Home'
import { Inbox } from 'icons/Inbox'
import { Library } from 'icons/Library'
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar'
import { Search } from 'icons/Search'
import { Backend } from 'icons/Backend'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { NavBarButton } from 'components/common/Buttons/NavBarButton'
import { InboxBadge } from 'components/InboxBadge'
import { PiggyBank, X, Users, RefreshCw, Wallet, Zap } from 'lucide-react'
import { FaDiscord, FaTelegramPlane, FaTwitter, FaYoutube, FaInstagram } from 'react-icons/fa'
import { gql, useQuery, useMutation } from '@apollo/client'
import { useMagicContext } from 'hooks/useMagicContext'
import { toast } from 'react-toastify'

const GET_UNCLAIMED_REWARDS = gql`
  query GetUnclaimedStreamingRewards {
    myUnclaimedStreamingRewards {
      totalUnclaimed
      tracksWithRewards
      breakdown {
        scid
        trackId
        unclaimed
      }
    }
  }
`

const CLAIM_STREAMING_REWARDS = gql`
  mutation ClaimStreamingRewards($input: ClaimStreamingRewardsInput!) {
    claimStreamingRewards(input: $input) {
      success
      totalClaimed
      tracksCount
      staked
      transactionHash
      error
    }
  }
`

export const BottomNavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const router = useRouter()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()
  const [showWinWinModal, setShowWinWinModal] = useState(false)
  const [showSocialModal, setShowSocialModal] = useState(false)

  // Fetch unclaimed streaming rewards - only when logged in and modal is open
  const { data: rewardsData, loading: rewardsLoading, refetch: refetchRewards } = useQuery(GET_UNCLAIMED_REWARDS, {
    skip: !me || !showWinWinModal,
    fetchPolicy: 'network-only',
  })

  // Get user's wallet address for claiming
  const { account: magicAccount } = useMagicContext()
  const userWallet = magicAccount || me?.magicWalletAddress || me?.googleWalletAddress || me?.discordWalletAddress || me?.twitchWalletAddress

  // Claim/stake mutation
  const [claimStreamingRewardsMutation, { loading: claimLoading }] = useMutation(CLAIM_STREAMING_REWARDS)

  // Handle claim to wallet
  const handleClaimToWallet = async () => {
    if (!userWallet) {
      toast.error('Please connect your wallet first')
      return
    }

    const unclaimedAmount = rewardsData?.myUnclaimedStreamingRewards?.totalUnclaimed || 0
    if (unclaimedAmount <= 0) {
      toast.error('No rewards to claim')
      return
    }

    try {
      const { data } = await claimStreamingRewardsMutation({
        variables: {
          input: {
            walletAddress: userWallet,
            stakeDirectly: false,
          },
        },
      })

      if (data?.claimStreamingRewards?.success) {
        const totalClaimed = data.claimStreamingRewards.totalClaimed
        toast.success(`Claimed ${totalClaimed.toFixed(4)} OGUN!`)
        refetchRewards()
      } else {
        toast.error(data?.claimStreamingRewards?.error || 'Claim failed')
      }
    } catch (err: any) {
      console.error('Claim error:', err)
      toast.error(err.message || 'Failed to claim rewards')
    }
  }

  // Handle stake rewards directly
  const handleStakeRewards = async () => {
    if (!userWallet) {
      toast.error('Please connect your wallet first')
      return
    }

    const unclaimedAmount = rewardsData?.myUnclaimedStreamingRewards?.totalUnclaimed || 0
    if (unclaimedAmount <= 0) {
      toast.error('No rewards to stake')
      return
    }

    try {
      const { data } = await claimStreamingRewardsMutation({
        variables: {
          input: {
            walletAddress: userWallet,
            stakeDirectly: true,
          },
        },
      })

      if (data?.claimStreamingRewards?.success) {
        const totalClaimed = data.claimStreamingRewards.totalClaimed
        toast.success(`Staked ${totalClaimed.toFixed(4)} OGUN!`)
        refetchRewards()
      } else {
        toast.error(data?.claimStreamingRewards?.error || 'Stake failed')
      }
    } catch (err: any) {
      console.error('Stake error:', err)
      toast.error(err.message || 'Failed to stake rewards')
    }
  }

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  useEffect(() => {
    if (process.browser) {
      window.onbeforeunload = e => {
        if (isMinting) {
          return 'You are minting an NFT. You should not leave SoundChain!'
        }
        e.preventDefault()
      }
    }
  }, [isMinting])

  const InboxBadgeWrapper = () => {
    return <InboxBadge showUnreadCount={false} />
  }

  // PiggyBank Icon component for NavBarButton
  const PiggyBankIcon = ({ className }: { className?: string }) => (
    <PiggyBank className={className || "w-6 h-6"} />
  )

  // Social/Connect Icon component for NavBarButton
  const SocialIcon = ({ className }: { className?: string }) => (
    <Users className={className || "w-6 h-6"} />
  )

  return (
    <>
      <nav id="bottom-nav-bar" className="inset-x-0 flex items-center bg-black py-3 shadow-2xl md:hidden">
        <div className="w-full">
          <div className="flex w-full items-end">
            <NavBarButton label="" path="/dex" icon={Home} color="yellow" alwaysShowLabel />
            <NavBarButton
              id="nav-explore-"
              label=""
              path={me ? '/explore' : '/login'}
              icon={Search}
              color="green"
              alwaysShowLabel
            />
            {/* WIN-WIN PiggyBank Button - Opens Streaming Rewards Modal */}
            <NavBarButton
              label=""
              icon={PiggyBankIcon}
              onClick={() => setShowWinWinModal(true)}
              color="pink-blue"
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-library-"
              label=""
              path={me ? '/library' : '/login'}
              icon={Library}
              color="purple"
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-market-"
              label=""
              icon={MarketplaceNavBar}
              color="purple-green"
              path={'/marketplace'}
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-market-"
              label=""
              icon={Inbox}
              color="purple-green"
              path={me ? '/messages' : '/login'}
              badge={me ? InboxBadgeWrapper : undefined}
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-backend-"
              label=""
              icon={Backend}
              color="cyan"
              path={'/backend'}
              alwaysShowLabel
            />
            {/* Vibes - Social Links Button */}
            <NavBarButton
              label=""
              icon={SocialIcon}
              onClick={() => setShowSocialModal(true)}
              color="purple-green"
              alwaysShowLabel
            />
          </div>
        </div>
      </nav>

      {/* WIN-WIN Streaming Rewards Modal */}
      {showWinWinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95" onClick={() => setShowWinWinModal(false)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border-2 border-pink-500 bg-gradient-to-br from-neutral-900 via-pink-900/20 to-neutral-900 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-900 to-purple-900 px-4 py-3 flex items-center justify-between border-b border-pink-500">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-6 h-6 text-pink-400" />
                <div>
                  <span className="font-bold text-pink-100 text-lg">WIN-WIN Rewards</span>
                  <p className="text-xs text-pink-200/60">Stream to Earn OGUN</p>
                </div>
              </div>
              <button
                onClick={() => setShowWinWinModal(false)}
                className="w-8 h-8 flex items-center justify-center text-pink-300 hover:text-white hover:bg-pink-500/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Your Unclaimed Rewards - Only show when logged in */}
              {me && (
                <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl p-4 border border-green-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-300 font-medium">Your Unclaimed OGUN</span>
                    <button
                      onClick={() => refetchRewards()}
                      disabled={rewardsLoading}
                      className="p-1 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${rewardsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {rewardsLoading ? (
                    <div className="text-2xl font-bold text-green-400 animate-pulse">Loading...</div>
                  ) : rewardsData?.myUnclaimedStreamingRewards ? (
                    <>
                      <div className="text-3xl font-bold text-green-400">
                        {rewardsData.myUnclaimedStreamingRewards.totalUnclaimed.toFixed(4)} OGUN
                      </div>
                      <div className="text-xs text-green-300/60 mt-1">
                        From {rewardsData.myUnclaimedStreamingRewards.tracksWithRewards} track{rewardsData.myUnclaimedStreamingRewards.tracksWithRewards !== 1 ? 's' : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-gray-500">0.0000 OGUN</div>
                  )}
                </div>
              )}

              {/* Tagline */}
              <div className="text-center p-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl border border-pink-500/30">
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Everyone Wins When You Stream!
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-pink-500/20">
                  <div className="text-2xl font-bold text-green-400">0.5</div>
                  <div className="text-xs text-gray-400">OGUN per NFT stream</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-pink-500/20">
                  <div className="text-2xl font-bold text-yellow-400">0.05</div>
                  <div className="text-xs text-gray-400">OGUN per regular stream</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">70%</div>
                  <div className="text-xs text-gray-400">Creator share</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-cyan-500/20">
                  <div className="text-2xl font-bold text-cyan-400">30%</div>
                  <div className="text-xs text-gray-400">Listener share</div>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-2 text-sm">
                <h3 className="font-semibold text-white">How it works:</h3>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">1.</span>
                  <span>Stream any track for 30+ seconds</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">2.</span>
                  <span>Both creator and listener earn OGUN tokens</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">3.</span>
                  <span>NFT tracks earn 10x more rewards!</span>
                </div>
              </div>

              {/* Claim/Stake Buttons - Only show when logged in with rewards */}
              {me && rewardsData?.myUnclaimedStreamingRewards?.totalUnclaimed > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    onClick={handleClaimToWallet}
                    disabled={claimLoading || !userWallet}
                    className="py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-600 text-black disabled:text-gray-400 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                  >
                    {claimLoading ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4" />
                    )}
                    Claim
                  </button>
                  <button
                    onClick={handleStakeRewards}
                    disabled={claimLoading || !userWallet}
                    className="py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white disabled:text-gray-400 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                  >
                    {claimLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Stake
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-pink-500/30 text-center">
                <span className="text-xs text-gray-500">
                  SOUNDCHAIN WIN-WIN | POLYGON MAINNET
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vibes - Social Links Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95" onClick={() => setShowSocialModal(false)} />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-purple-500 bg-gradient-to-br from-neutral-900 via-purple-900/20 to-neutral-900 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-cyan-900 px-4 py-3 flex items-center justify-between border-b border-purple-500">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-400" />
                <div>
                  <span className="font-bold text-purple-100 text-lg">Vibes</span>
                  <p className="text-xs text-purple-200/60">Connect with SoundChain</p>
                </div>
              </div>
              <button
                onClick={() => setShowSocialModal(false)}
                className="w-8 h-8 flex items-center justify-center text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Social Links */}
            <div className="p-4 space-y-3">
              <a
                href="https://twitter.com/soundchain_io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <FaTwitter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Twitter / X</div>
                  <div className="text-xs text-blue-400">@soundchain_io</div>
                </div>
              </a>

              <a
                href="https://discord.gg/5yZG6BTTHV"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                  <FaDiscord className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Discord</div>
                  <div className="text-xs text-indigo-400">Join Community</div>
                </div>
              </a>

              <a
                href="https://t.me/+DbHfqlVpV644ZGMx"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                  <FaTelegramPlane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Telegram</div>
                  <div className="text-xs text-cyan-400">Join Chat</div>
                </div>
              </a>

              <a
                href="https://instagram.com/soundchain.io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center">
                  <FaInstagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Instagram</div>
                  <div className="text-xs text-pink-400">@soundchain.io</div>
                </div>
              </a>

              <a
                href="https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <FaYoutube className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">YouTube</div>
                  <div className="text-xs text-red-400">SoundChain</div>
                </div>
              </a>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <div className="pt-3 border-t border-purple-500/30 text-center">
                <span className="text-xs text-gray-500">
                  SOUNDCHAIN | THE FUTURE OF MUSIC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
