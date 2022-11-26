import { Menu, Transition } from '@headlessui/react'
import { ShareIcon } from '@heroicons/react/outline'
import { useModalDispatch } from 'contexts/providers/modal'
import { Fragment } from 'react'
import { toast } from 'react-toastify'

type Props = {
  trackId: string
  title?: string | null
  artist?: string | null
  position?: 'top-right' | 'top-left' | 'bottom-left'
  height?: number
  width?: number
  color?: string
  label?: boolean
}

export const TrackShareButton = (props: Props) => {
  const { trackId, title, artist, position, height = 18, width = 18, color, label = false } = props

  const { dispatchShowPostModal, dispatchShowAudioPlayerModal } = useModalDispatch()

  const handleSharing = async () => {
    const url = `${window.location.origin}/tracks/${trackId}`

    try {
      await navigator
        .share({
          title: `SoundChain`,
          text: `Listen to this SoundChain track: ${title} - ${artist}`,
          url,
        })
        .catch(error => {
          if (!error.toString().includes('AbortError')) {
            toast('URL copied to clipboard')
          }
        })
    } catch {
      await navigator.clipboard.writeText(url)
      toast('URL copied to clipboard')
    }
  }

  const handlePost = () => {
    dispatchShowAudioPlayerModal(false)
    dispatchShowPostModal(true, trackId)
  }

  return (
    <div className="flex items-center">
      <Menu>
        <Menu.Button aria-label="Share" className="">
          <div className="flex items-center gap-4">
            <ShareIcon width={width} height={height} color={color || ''} />
            {label && <h3>Share</h3>}
          </div>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={`absolute ${getPosition(
              position,
            )} z-40 flex w-32 flex-col rounded-lg bg-gray-20 text-white shadow-lg`}
          >
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full px-5 py-4 text-left text-xs font-semibold ${active && 'rounded-md bg-gray-40'}`}
                  onClick={handleSharing}
                >
                  Share URL
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full px-5 py-4 text-left text-xs font-semibold ${active && 'rounded-md bg-gray-40'}`}
                  onClick={handlePost}
                >
                  Share as Post
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
}

const getPosition = (position: Props['position']) => {
  switch (position) {
    case 'top-right':
      return 'bottom-5 left-5'
    case 'top-left':
      return 'top-10 left-0'
    case 'bottom-left':
      return 'bottom-[65px] left-3'
    default:
      return 'top-8 right-0'
  }
}
