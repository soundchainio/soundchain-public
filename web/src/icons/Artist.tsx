import { IconProps } from './types/IconProps';

export const Artist = ({ ...props }: IconProps) => {
  return (
    <svg width={15} height={15} className="scale-125 mr-1" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M.188 8.236a.44.44 0 00-.132.575l1.08 1.87a.44.44 0 00.564.173l3.299-1.597v5.737h1.666V8.448l3.393-1.644L7.875 3.02.188 8.236zM14.547 1.69A3.384 3.384 0 009.925.453c-.759.438-1.257 1.133-1.501 1.908l2.48 4.297c.793.177 1.644.092 2.404-.346a3.383 3.383 0 001.239-4.622z"
        fill="#505050"
      />
    </svg>
  );
};
