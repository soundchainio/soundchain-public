import classNames from 'classnames'
import { Button } from 'components/common/Buttons/Button'
import { default as React, useEffect, useState } from 'react'
import { MediaProvider } from 'types/MediaProvider'
import { PostLinkType } from 'types/PostLinkType'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'
import { ModalsPortal } from './ModalsPortal'
import { MediaLink, PostLinkInput } from './Post/PostLinkInput'

interface AddLinkProps {
  onClose: () => void
  setOriginalLink: (val: string) => void
  setShow: (val: boolean) => void
  show: boolean
  type: PostLinkType
  postLink: string
  setPostLink: (val: string) => void
}

const baseClasses =
  'fixed left-0 w-screen top-0 h-full bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform'

export const LinksModal = ({ onClose, show, setShow, setOriginalLink, type, postLink, setPostLink }: AddLinkProps) => {
  const [link, setLink] = useState<MediaLink>()

  const handleSubmit = () => {
    if (link) {
      setOriginalLink(link.value)
      setShow(false)
    } else {
      setOriginalLink('')
      setShow(false)
    }
  }

  useEffect(() => {
    if (postLink) {
      const identifiedSource = IdentifySource(postLink)
      if (identifiedSource.type && identifiedSource.value != link?.value) {
        setLink(identifiedSource)
      }
    }
  }, [postLink])

  return (
    <ModalsPortal>
      <div className={classNames(baseClasses, show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0')}>
        <div className="flex h-full flex-col bg-gray-20">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
            <button className="flex-1 p-2 text-center font-bold text-gray-400" onClick={onClose}>
              Cancel
            </button>
            <div className="flex-1 text-center font-bold text-white">Embed</div>
            <div className="m-2 flex-1 text-center">
              <Button
                className="bg-gray-30 text-sm"
                type="button"
                variant="green-yellow-gradient"
                onClick={handleSubmit}
              >
                Save
              </Button>
            </div>
          </div>
          {type === PostLinkType.MUSIC && (
            <>
              <div className="mt-4 mb-4 ml-auto mr-auto w-9/12 text-sm text-gray-400">
                Paste a music link from Soundcloud, Spotify or Bandcamp to embed the music to your post.
              </div>
              <div>
                <PostLinkInput
                  type={MediaProvider.SOUNDCLOUD}
                  setLink={setLink}
                  link={link}
                  setPostLink={setPostLink}
                />
                <PostLinkInput type={MediaProvider.SPOTIFY} setLink={setLink} link={link} setPostLink={setPostLink} />
                <PostLinkInput type={MediaProvider.BANDCAMP} setLink={setLink} link={link} setPostLink={setPostLink} />
              </div>
            </>
          )}
          {type === PostLinkType.VIDEO && (
            <>
              <div className="mt-4 mb-4 ml-auto mr-auto w-9/12 text-sm text-gray-400">
                Paste a video link from Youtube or Vimeo to embed the video to your post.
              </div>
              <div>
                <PostLinkInput type={MediaProvider.YOUTUBE} setLink={setLink} link={link} setPostLink={setPostLink} />
                <PostLinkInput type={MediaProvider.VIMEO} setLink={setLink} link={link} setPostLink={setPostLink} />
              </div>
            </>
          )}
        </div>
      </div>
    </ModalsPortal>
  )
}
