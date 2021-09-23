import { IconProps } from './types/IconProps';

export const Bandcamp = (props: IconProps) => {
  return (
    <svg
      width={100}
      height={59}
      className="scale-50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 58.333h69.444L100 0H33.333L0 58.333z" fill="#1DA0C3" />
    </svg>
  );
};
