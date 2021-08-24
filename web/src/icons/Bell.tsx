import { IconProps } from './types/IconProps';

export const Bell = ({ activated, ...props }: IconProps) => {
  return (
    <>
      {activated ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" fill="none" viewBox="0 0 16 20" {...props}>
          <path
            stroke="url(#bell_linear)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7.253 4h0l1.466.003s0 0 0 0c2.84.007 5.26 2.305 5.296 5.004v3.782c0 .856.104 1.865.695 2.767h0l.287.438h0L15 16s0 0 0 0V16H1s0 0 0 0l.003-.004v-.002l.287-.438s0 0 0 0c.593-.902.695-1.911.695-2.766V9.004c.021-2.7 2.436-5.01 5.268-5.004z"
          ></path>
          <mask id="path-2-inside-1" fill="#fff">
            <path d="M11 17a3 3 0 01-6 0"></path>
          </mask>
          <path
            fill="url(#paint1_linear)"
            d="M13 17a2 2 0 00-4 0h4zm-5 3v2-2zm-1-3a2 2 0 10-4 0h4zm2 0a1 1 0 01-.293.707l2.829 2.828A5 5 0 0013 17H9zm-.293.707A1 1 0 018 18v4a5 5 0 003.536-1.465l-2.829-2.828zM8 18a1 1 0 01-.707-.293l-2.828 2.828A5 5 0 008 22v-4zm-.707-.293A1 1 0 017 17H3a5 5 0 001.465 3.535l2.828-2.828z"
            mask="url(#path-2-inside-1)"
          ></path>
          <path
            stroke="url(#paint2_linear)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 1a1 1 0 011 1H7a1 1 0 011-1z"
          ></path>
          <defs>
            <linearGradient
              id="bell_linear"
              x1="0.259"
              x2="14.056"
              y1="11.986"
              y2="8.171"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#AB4EFF"></stop>
              <stop offset="1" stopColor="#F1419E"></stop>
            </linearGradient>
            <linearGradient
              id="paint1_linear"
              x1="5.097"
              x2="9.61"
              y1="18.925"
              y2="16.742"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#AB4EFF"></stop>
              <stop offset="1" stopColor="#F1419E"></stop>
            </linearGradient>
            <linearGradient
              id="paint2_linear"
              x1="6.065"
              x2="9.428"
              y1="1.925"
              y2="0.841"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#AB4EFF"></stop>
              <stop offset="1" stopColor="#F1419E"></stop>
            </linearGradient>
          </defs>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" fill="none" viewBox="0 0 16 20" {...props}>
          <path
            stroke="#505050"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7.253 4h0l1.466.003s0 0 0 0c2.84.007 5.26 2.305 5.296 5.004v3.782c0 .856.104 1.865.695 2.767h0l.287.438h0L15 16s0 0 0 0V16H1s0 0 0 0l.003-.004v-.002l.287-.438s0 0 0 0c.593-.902.695-1.911.695-2.766V9.004c.021-2.7 2.436-5.01 5.268-5.004z"
          ></path>
          <mask id="path-2-inside-1" fill="#fff">
            <path d="M11 17a3 3 0 01-6 0"></path>
          </mask>
          <path
            fill="#505050"
            d="M13 17a2 2 0 00-4 0h4zm-5 3v2-2zm-1-3a2 2 0 10-4 0h4zm2 0a1 1 0 01-.293.707l2.829 2.828A5 5 0 0013 17H9zm-.293.707A1 1 0 018 18v4a5 5 0 003.536-1.465l-2.829-2.828zM8 18a1 1 0 01-.707-.293l-2.828 2.828A5 5 0 008 22v-4zm-.707-.293A1 1 0 017 17H3a5 5 0 001.465 3.535l2.828-2.828z"
            mask="url(#path-2-inside-1)"
          ></path>
          <path
            stroke="#505050"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 1a1 1 0 011 1H7a1 1 0 011-1z"
          ></path>
        </svg>
      )}
    </>
  );
};
