export const Checkmark2 = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M5.20001 8.35L7.30001 10.45L10.8 6.25"
        stroke="url(#paint0_linear_4848_9132)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z"
        stroke="url(#paint1_linear_4848_9132)"
        strokeWidth="2"
      />
      <defs>
        <linearGradient
          id="paint0_linear_4848_9132"
          x1="5.29059"
          y1="8.9457"
          x2="9.99863"
          y2="7.42707"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#278E31" />
          <stop offset="1" stopColor="#52B33B" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_4848_9132"
          x1="1.22644"
          y1="9.98567"
          x2="13.5027"
          y2="7.0158"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#278E31" />
          <stop offset="1" stopColor="#52B33B" />
        </linearGradient>
      </defs>
    </svg>
  );
};
