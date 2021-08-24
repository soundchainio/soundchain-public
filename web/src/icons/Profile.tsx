import { IconProps } from './types/IconProps';

export const Profile = ({ activated, ...props }: IconProps) => {
  return (
    <>
      {activated ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
          <path
            fill="url(#profile_linear)"
            d="M10 4.286a3.571 3.571 0 100 7.143 3.571 3.571 0 000-7.143zM10 10a2.143 2.143 0 110-4.286A2.143 2.143 0 0110 10z"
          ></path>
          <path
            fill="url(#paint1_linear)"
            d="M10 0a10 10 0 1010 10A10.011 10.011 0 0010 0zM5.714 17.412v-.983a2.145 2.145 0 012.143-2.143h4.286a2.145 2.145 0 012.143 2.143v.983a8.499 8.499 0 01-8.572 0zm9.995-1.036a3.574 3.574 0 00-3.566-3.519H7.857a3.573 3.573 0 00-3.566 3.519 8.571 8.571 0 1111.418 0z"
          ></path>
          <defs>
            <linearGradient
              id="profile_linear"
              x1="10.35"
              x2="9.964"
              y1="9.936"
              y2="5.032"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#3FDD8A"></stop>
              <stop offset="1" stopColor="#A252FE"></stop>
            </linearGradient>
            <linearGradient
              id="paint1_linear"
              x1="10.98"
              x2="9.9"
              y1="15.821"
              y2="2.089"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#3FDD8A"></stop>
              <stop offset="1" stopColor="#A252FE"></stop>
            </linearGradient>
          </defs>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
          <path
            fill="#505050"
            d="M10 4.286a3.571 3.571 0 100 7.143 3.571 3.571 0 000-7.143zM10 10a2.143 2.143 0 110-4.286A2.143 2.143 0 0110 10z"
          ></path>
          <path
            fill="#505050"
            d="M10 0a10 10 0 1010 10A10.011 10.011 0 0010 0zM5.714 17.412v-.983a2.145 2.145 0 012.143-2.143h4.286a2.145 2.145 0 012.143 2.143v.983a8.499 8.499 0 01-8.572 0zm9.995-1.036a3.574 3.574 0 00-3.566-3.519H7.857a3.573 3.573 0 00-3.566 3.519 8.571 8.571 0 1111.418 0z"
          ></path>
        </svg>
      )}
    </>
  );
};
