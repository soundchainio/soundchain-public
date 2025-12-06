import { Fragment } from 'react'

import { useModalDispatch } from 'contexts/ModalContext'
import { toast } from 'react-toastify'

import { Menu, Transition } from '@headlessui/react'
import { ShareIcon } from '@heroicons/react/24/outline'

type Props = {
  trackId: string
  title?: string | null
  artist?: string | null
  position?: 'top-right'
  height?: number
  width?: number
  color?: string
}

export const TrackShareButton = (props: Props) => {
  const { trackId, title, artist, position, height = 18, width = 18, color } = props

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
    dispatchShowPostModal({ show: true, trackId })
  }

  return (
    <div className="relative flex items-center">
      <Menu>
        <Menu.Button aria-label="Share" className="flex h-10 w-10 items-center justify-center text-gray-80">
          <ShareIcon width={width} height={height} color={color || ''} />
        </Menu.Button>
        <Transition
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
    default:
      return 'top-8 right-0'
  }
}