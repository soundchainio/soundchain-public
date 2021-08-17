import classNames from 'classnames';
import { Button } from 'components/Button';
import 'emoji-mart/css/emoji-mart.css';
import { default as React, useState } from 'react';
import { PostLinkInput } from './PostLinkInput';

interface AddLinkProps {
  onClose: () => void;
  setOriginalLink: (val: string) => void;
  setShow: (val: boolean) => void;
  show: boolean;
  type: string;
}

const baseClasses =
  'absolute left-0 w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const LinksModal = ({ onClose, show, setShow, setOriginalLink, type }: AddLinkProps) => {
  const [link, setLink] = useState({
    type: '',
    value: '',
  });

  const cancel = () => {
    onClose();
  };

  const handleSubmit = () => {
    setOriginalLink(link.value);
    setShow(false);
  };

  const handleSetLink = (value: string, type: string) => {
    setLink({ type, value });
  };

  return (
    <div className={classNames(baseClasses, show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0')}>
      <div className="w-screen h-20" onClick={cancel} />
      <div className="flex flex-col max-height-from-menu bg-gray-20">
        <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
          <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={cancel}>
            Cancel
          </div>
          <div className="flex-1 text-center text-white font-bold">Embed</div>
          <div className="flex-1 text-center">
            <Button className="text-sm m-2 rounded-lg" variant="rainbow-rounded" onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
        {type == 'music' && (
          <>
            <div className="text-gray-400 mt-4 mb-4 w-9/12 ml-auto mr-auto text-sm">
              Paste a video link from Soundcloud or Spotify to embed the video to your post.
            </div>
            <div>
              <PostLinkInput type="SoundCloud" handleSetLink={handleSetLink} link={link} />
              <PostLinkInput type="Spotify" handleSetLink={handleSetLink} link={link} />
            </div>
          </>
        )}
        {type == 'video' && (
          <>
            <div className="text-gray-400 mt-4 mb-4 w-9/12 ml-auto mr-auto text-sm">
              Paste a video link from Youtube or Vimeo to embed the video to your post.
            </div>
            <div>
              <PostLinkInput type="Youtube" handleSetLink={handleSetLink} link={link} />
              <PostLinkInput type="Vimeo" handleSetLink={handleSetLink} link={link} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
