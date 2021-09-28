import { IconProps } from './types/IconProps';

export const Playlists = ({ activatedColor, className }: IconProps) => {
  return (
    <svg
      width={15}
      height={12}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8.25 9.37c0 1.45 1.18 2.63 2.63 2.63s2.63-1.18 2.63-2.63c0-.133-.02-.26-.04-.388h.03V1.5H15V0h-2.25a.75.75 0 00-.75.75V7a2.599 2.599 0 00-1.12-.26 2.633 2.633 0 00-2.63 2.63zM0 .75h10.5v1.5H0V.75z"
        fill={activatedColor ? activatedColor : '#505050'}
      />
      <path
        d="M0 3.75h10.5v1.5H0v-1.5zm0 3h6.75v1.5H0v-1.5zm0 3h6.75v1.5H0v-1.5z"
        fill={activatedColor ? activatedColor : '#505050'}
      />
    </svg>
  );
};
