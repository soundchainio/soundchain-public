interface SubscribeBellProps {
  isSubscriber: boolean;
}

export const SubscribeBell = ({ isSubscriber }: SubscribeBellProps) => {
  return (
    <>
      {isSubscriber ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="15" fill="url(#paint_bell_0_linear)"></circle>
          <path
            fill="#fff"
            d="M15.25 21a1.5 1.5 0 001.5-1.5h-3a1.5 1.5 0 001.5 1.5zm5.048-3.509c-.453-.486-1.3-1.218-1.3-3.616 0-1.821-1.277-3.279-2.999-3.637V9.75a.75.75 0 10-1.498 0v.488c-1.722.358-3 1.816-3 3.637 0 2.398-.846 3.13-1.3 3.616A.732.732 0 0010 18a.75.75 0 00.752.75h8.996a.75.75 0 00.55-1.259z"
          ></path>
          <defs>
            <linearGradient
              id="paint_bell_0_linear"
              x1="0.485"
              x2="26.791"
              y1="19.255"
              y2="12.891"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7A278E"></stop>
              <stop offset="1" stopColor="#AC6AFF"></stop>
            </linearGradient>
          </defs>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="14" stroke="url(#paint_bell_0_linear)" strokeWidth="2"></circle>
          <path
            fill="url(#paint_bell_1_linear)"
            d="M15.25 21a1.5 1.5 0 001.5-1.5h-3a1.5 1.5 0 001.5 1.5zm5.048-3.509c-.453-.486-1.3-1.218-1.3-3.616 0-1.821-1.277-3.279-2.999-3.637V9.75a.75.75 0 10-1.498 0v.488c-1.722.358-3 1.816-3 3.637 0 2.398-.846 3.13-1.3 3.616A.732.732 0 0010 18a.75.75 0 00.752.75h8.996a.75.75 0 00.55-1.259z"
          ></path>
          <defs>
            <linearGradient
              id="paint_bell_0_linear"
              x1="0.485"
              x2="26.791"
              y1="19.255"
              y2="12.891"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7A278E"></stop>
              <stop offset="1" stopColor="#AC6AFF"></stop>
            </linearGradient>
            <linearGradient
              id="paint_bell_1_linear"
              x1="10.17"
              x2="19.498"
              y1="16.702"
              y2="14.727"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7A278E"></stop>
              <stop offset="1" stopColor="#AC6AFF"></stop>
            </linearGradient>
          </defs>
        </svg>
      )}
    </>
  );
};
