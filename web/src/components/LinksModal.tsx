import classNames from 'classnames';
import { Button } from 'components/Button';
import 'emoji-mart/css/emoji-mart.css';
import { default as React, useEffect, useState } from 'react';
import { MediaProvider } from 'types/MediaProvider';
import { PostLinkType } from 'types/PostLinkType';
import { IdentifySource } from 'utils/NormalizeEmbedLinks';
import { ModalsPortal } from './ModalsPortal';
import { MediaLink, PostLinkInput } from './PostLinkInput';

interface AddLinkProps {
  onClose: () => void;
  setOriginalLink: (val: string) => void;
  setShow: (val: boolean) => void;
  show: boolean;
  type: PostLinkType;
  postLink: string;
  setPostLink: (val: string) => void;
}

const baseClasses =
  'absolute left-0 w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const LinksModal = ({ onClose, show, setShow, setOriginalLink, type, postLink, setPostLink }: AddLinkProps) => {
  const [link, setLink] = useState<MediaLink>();

  const handleSubmit = () => {
    if (link) {
      setOriginalLink(link.value);
      setShow(false);
    } else {
      setOriginalLink('');
      setShow(false);
    }
  };

  useEffect(() => {
    if (postLink) {
      const identifiedSource = IdentifySource(postLink);

      if (identifiedSource.type && identifiedSource != link) {
        setLink(identifiedSource);
      }
    } else {
      setLink(undefined);
    }
  }, [postLink]);

  return (
    <ModalsPortal>
      <div className={classNames(baseClasses, show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0')}>
        <div className="w-screen h-20" onClick={onClose} />
        <div className="flex flex-col max-height-from-menu bg-gray-20">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
            <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={onClose}>
              Cancel
            </div>
            <div className="flex-1 text-center text-white font-bold">Embed</div>
            <div className="flex-1 text-center m-2">
              <Button className="bg-gray-30 text-sm" type="button" variant="green-gradient" onClick={handleSubmit}>
                Save
              </Button>
            </div>
          </div>
          {type === PostLinkType.MUSIC && (
            <>
              <div className="text-gray-400 mt-4 mb-4 w-9/12 ml-auto mr-auto text-sm">
                Paste a video link from Soundcloud or Spotify to embed the video to your post.
              </div>
              <div>
                <PostLinkInput
                  type={MediaProvider.SOUNDCLOUD}
                  setLink={setLink}
                  link={link}
                  setPostLink={setPostLink}
                />
                <PostLinkInput type={MediaProvider.SPOTIFY} setLink={setLink} link={link} setPostLink={setPostLink} />
              </div>
            </>
          )}
          {type === PostLinkType.VIDEO && (
            <>
              <div className="text-gray-400 mt-4 mb-4 w-9/12 ml-auto mr-auto text-sm">
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
  );
};
