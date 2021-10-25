import { IconProps } from './types/IconProps';

export const Copy = ({ color, ...props }: IconProps) => {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 0H4a1 1 0 00-1 1v1h4a1 1 0 011 1v4h1a1 1 0 001-1V1a1 1 0 00-1-1z" fill="#fff" />
      <path
        d="M1 10h5c.551 0 1-.448 1-1V4c0-.551-.449-1-1-1H1c-.551 0-1 .449-1 1v5c0 .552.449 1 1 1zm1-5h3v1H2V5zm0 2h3v1H2V7z"
        fill="#fff"
      />
    </svg>
  );
};
