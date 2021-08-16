import { IconProps } from './types/IconProps';

export const Notification = (props: IconProps) => {
  return (
    <>
      {props.activated ? (
        <svg width={25} height={25} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
          <path
            d="M7.253 4h0l1.466.003s0 0 0 0c2.84.007 5.26 2.305 5.296 5.004v3.782c0 .856.104 1.865.695 2.767h0l.287.438h0L15 16s0 0 0 0V16H1s0 0 0 0l.003-.004v-.002l.287-.438s0 0 0 0c.593-.902.695-1.911.695-2.766V9.004c.021-2.7 2.436-5.01 5.268-5.004z"
            stroke="#505050"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <mask id="prefix__a" fill="#fff">
            <path d="M11 17a3 3 0 01-6 0" />
          </mask>
          <path
            d="M13 17a2 2 0 00-4 0h4zm-5 3v2-2zm-1-3a2 2 0 10-4 0h4zm2 0a1 1 0 01-.293.707l2.829 2.828A5 5 0 0013 17H9zm-.293.707A1 1 0 018 18v4a5 5 0 003.536-1.465l-2.829-2.828zM8 18a1 1 0 01-.707-.293l-2.828 2.828A5 5 0 008 22v-4zm-.707-.293A1 1 0 017 17H3a5 5 0 001.465 3.535l2.828-2.828z"
            fill="#505050"
            mask="url(#prefix__a)"
          />
          <path
            d="M8 1a1 1 0 011 1H7a1 1 0 011-1z"
            stroke="#505050"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width={25} height={25} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
          <path
            d="M7.253 4h0l1.466.003s0 0 0 0c2.84.007 5.26 2.305 5.296 5.004v3.782c0 .856.104 1.865.695 2.767h0l.287.438h0L15 16s0 0 0 0V16H1s0 0 0 0l.003-.004v-.002l.287-.438s0 0 0 0c.593-.902.695-1.911.695-2.766V9.004c.021-2.7 2.436-5.01 5.268-5.004z"
            stroke="#505050"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <mask id="prefix__a" fill="#fff">
            <path d="M11 17a3 3 0 01-6 0" />
          </mask>
          <path
            d="M13 17a2 2 0 00-4 0h4zm-5 3v2-2zm-1-3a2 2 0 10-4 0h4zm2 0a1 1 0 01-.293.707l2.829 2.828A5 5 0 0013 17H9zm-.293.707A1 1 0 018 18v4a5 5 0 003.536-1.465l-2.829-2.828zM8 18a1 1 0 01-.707-.293l-2.828 2.828A5 5 0 008 22v-4zm-.707-.293A1 1 0 017 17H3a5 5 0 001.465 3.535l2.828-2.828z"
            fill="#505050"
            mask="url(#prefix__a)"
          />
          <path
            d="M8 1a1 1 0 011 1H7a1 1 0 011-1z"
            stroke="#505050"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );
};
