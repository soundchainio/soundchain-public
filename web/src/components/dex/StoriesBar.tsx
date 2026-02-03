import { useState, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, Lock, Sparkles } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'

interface Story {
  id: string
  profileId: string
  profilePicture?: string
  displayName?: string
  userHandle: string
  hasUnwatched: boolean
  isPermanent?: boolean
  storyCount: number
}

interface StoriesBarProps {
  onCreateStory?: () => void
  onViewStory?: (profileId: string) => void
}

// Mock data for now - will be replaced with GraphQL query
const mockStories: Story[] = [
  { id: '1', profileId: 'p1', displayName: 'Ye', userHandle: 'ye', hasUnwatched: true, isPermanent: true, storyCount: 3, profilePicture: '' },
  { id: '2', profileId: 'p2', displayName: 'fern_dev', userHandle: 'fern_dev', hasUnwatched: true, storyCount: 1, profilePicture: '' },
  { id: '3', profileId: 'p3', displayName: 'DJ Shadow', userHandle: 'djshadow', hasUnwatched: false, storyCount: 2, profilePicture: '' },
  { id: '4', profileId: 'p4', displayName: 'Crypto Kid', userHandle: 'cryptokid', hasUnwatched: true, storyCount: 1, profilePicture: '' },
  { id: '5', profileId: 'p5', displayName: 'Bass Queen', userHandle: 'bassqueen', hasUnwatched: true, isPermanent: true, storyCount: 5, profilePicture: '' },
  { id: '6', profileId: 'p6', displayName: 'Vinyl Vibes', userHandle: 'vinylvibes', hasUnwatched: false, storyCount: 1, profilePicture: '' },
  { id: '7', profileId: 'p7', displayName: 'Beat Master', userHandle: 'beatmaster', hasUnwatched: true, storyCount: 2, profilePicture: '' },
  { id: '8', profileId: 'p8', displayName: 'Lo-Fi Luna', userHandle: 'lofiluna', hasUnwatched: true, storyCount: 1, profilePicture: '' },
]

export const StoriesBar = ({ onCreateStory, onViewStory }: StoriesBarProps) => {
  const { me } = useMe()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 200
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const handleCreateStory = () => {
    if (onCreateStory) {
      onCreateStory()
    } else {
      // Default: open create modal with story tab
      // For now, just log
      console.log('Create story clicked')
    }
  }

  const handleViewStory = (story: Story) => {
    if (onViewStory) {
      onViewStory(story.profileId)
    } else {
      // Default: navigate to story view
      router.push(`/dex/story/${story.userHandle}`)
    }
  }

  return (
    <div className="relative w-full py-2 bg-black/40 backdrop-blur-sm border-b border-white/5">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-white hover:border-cyan-500/50 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-white hover:border-cyan-500/50 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Stories scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 px-4 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Your Story - Create new */}
        <button
          onClick={handleCreateStory}
          className="flex flex-col items-center gap-1 flex-shrink-0 group"
        >
          <div className="relative">
            {/* Outer ring - dashed for "add" state */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-500/50 group-hover:border-cyan-400 transition-colors flex items-center justify-center">
              {/* Avatar or placeholder */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
                {me?.profile?.profilePicture ? (
                  <img
                    src={me.profile.profilePicture}
                    alt="Your story"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white/50">
                    {me?.profile?.displayName?.charAt(0) || me?.profile?.userHandle?.charAt(0) || '?'}
                  </span>
                )}
              </div>
            </div>
            {/* Plus button */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center ring-2 ring-black">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-cyan-400 transition-colors">Your Story</span>
        </button>

        {/* Other users' stories */}
        {mockStories.map((story) => (
          <button
            key={story.id}
            onClick={() => handleViewStory(story)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group"
          >
            <div className="relative">
              {/* Gradient ring - colorful if unwatched, gray if watched */}
              <div
                className={`w-16 h-16 rounded-full p-[2px] transition-all ${
                  story.hasUnwatched
                    ? 'bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 group-hover:from-cyan-400 group-hover:via-purple-400 group-hover:to-pink-400'
                    : 'bg-gradient-to-tr from-gray-600 to-gray-700'
                }`}
              >
                {/* Inner black ring */}
                <div className="w-full h-full rounded-full p-[2px] bg-black">
                  {/* Avatar */}
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
                    {story.profilePicture ? (
                      <img
                        src={story.profilePicture}
                        alt={story.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white/70">
                        {story.displayName?.charAt(0) || story.userHandle?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Permanent badge */}
              {story.isPermanent && (
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center ring-2 ring-black" title="Permanent Reel">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              )}

              {/* Multiple stories indicator */}
              {story.storyCount > 1 && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/10">
                  <span className="text-[8px] text-cyan-400 font-medium">{story.storyCount}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors max-w-[60px] truncate">
              {story.displayName || story.userHandle}
            </span>
          </button>
        ))}

        {/* "See All" button at end */}
        <button
          onClick={() => router.push('/dex/stories')}
          className="flex flex-col items-center gap-1 flex-shrink-0 group px-2"
        >
          <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all">
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-cyan-400 transition-colors">See All</span>
        </button>
      </div>

      {/* Subtle bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
    </div>
  )
}
