import { IconProps } from './types/IconProps';

export const Home = (props: IconProps) => {
  return (
    <>
      {props.activated ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
          <path
            fill="url(#paint0_linear)"
            d="M1 11h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 00.707-1.707l-9-9a1 1 0 00-1.414 0l-9 9A1 1 0 001 11zm7 7v-5h4v5H8zm2-15.586l6 6V18h-2v-5c0-1.103-.897-2-2-2H8c-1.103 0-2 .897-2 2v5H4V8.414l6-6z"
          ></path>
          <defs>
            <linearGradient
              id="paint0_linear"
              x1="14.309"
              x2="6.737"
              y1="3.244"
              y2="11.384"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FE5540"></stop>
              <stop offset="0.69" stopColor="#FCAE1B"></stop>
              <stop offset="1" stopColor="#FED603"></stop>
            </linearGradient>
          </defs>
        </svg>
      ) : (
        <svg width={25} height={25} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
          <path
            d="M1 11h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 00.707-1.707l-9-9a1 1 0 00-1.414 0l-9 9A1 1 0 001 11zm7 7v-5h4v5H8zm2-15.586l6 6V18h-2v-5c0-1.103-.897-2-2-2H8c-1.103 0-2 .897-2 2v5H4V8.414l6-6z"
            fill="#505050"
          />
        </svg>
      )}
    </>
  );
};
