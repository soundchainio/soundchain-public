import * as React from 'react';

export const Logo = ({ id = 'logo', width, height, ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      id={id || 'logo'}
      width={width || 100}
      height={height || 100}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M27.879 65.765a15.302 15.302 0 01-6.045-1.114 15.526 15.526 0 01-5.15-3.412 15.856 15.856 0 01-3.45-5.177 16.094 16.094 0 010-12.267 15.857 15.857 0 013.45-5.176 15.526 15.526 0 015.15-3.412 15.302 15.302 0 016.045-1.114h2.285V21.92h-2.285C12.473 21.92 0 34.457 0 49.926s12.485 28.006 27.879 28.006h6.266l-.206-6.21a6.225 6.225 0 00-1.848-4.226 6.003 6.003 0 00-4.212-1.73z"
        fill={`url(#${id}_prefix__paint0_linear)`}
      />
      <path
        d="M87.879 49.938c-.034 4.226-1.712 8.265-4.666 11.232a15.52 15.52 0 01-11.092 4.595h-6.667a9.946 9.946 0 013.723 3.678 10.186 10.186 0 011.374 5.094V77.932h1.57C87.515 77.932 100 65.407 100 49.95c0-15.456-12.479-28.03-27.879-28.03h-45.94v12.173h45.94a15.405 15.405 0 016 1.174 15.633 15.633 0 015.102 3.423 15.962 15.962 0 013.426 5.153 16.2 16.2 0 011.23 6.095z"
        fill={`url(#${id}_prefix__paint1_linear)`}
      />
      <path
        d="M78.073 72.222c-.079 15.432-12.618 27.888-28 27.777h-2.115c-14.14-.11-25.534-11.648-25.534-25.845v-8.389h10.303c.483 0 .945.195 1.286.543.341.347.532.818.532 1.309v6.537a13.88 13.88 0 003.99 9.667 13.379 13.379 0 009.52 3.993h2.12a15.326 15.326 0 0010.986-4.506c2.93-2.927 4.599-6.919 4.64-11.099a15.915 15.915 0 00-4.426-11.188 15.338 15.338 0 00-10.896-4.725h-.552l.152-12.172h.551c15.261.21 27.552 12.746 27.443 28.098z"
        fill={`url(#${id}_prefix__paint2_linear)`}
      />
      <path
        d="M49.806 0c-7.263-.002-14.233 2.914-19.399 8.115-5.165 5.2-8.107 12.266-8.189 19.663-.085 15.53 12.479 28.518 28.085 28.518v-12.16c-4.234-.023-8.287-1.75-11.276-4.803-2.99-3.054-4.672-7.187-4.681-11.5a15.979 15.979 0 014.582-11.06 15.404 15.404 0 0110.884-4.606h1.703c2.926-.013 5.78.927 8.146 2.68a13.986 13.986 0 015.006 7.073h7.454c1.693 0 3.382.154 5.049.457-.915-6.25-4.014-11.955-8.726-16.066C63.73 2.201 57.72-.04 51.515.001h-1.709z"
        fill={`url(#${id}_prefix__paint3_linear)`}
      />
      <defs>
        <linearGradient
          id={`${id}_prefix__paint0_linear`}
          x1={18.745}
          y1={66.228}
          x2={13.838}
          y2={28.165}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3FDD8A" />
          <stop offset={1} stopColor="#A252FE" />
        </linearGradient>
        <linearGradient
          id={`${id}_prefix__paint1_linear`}
          x1={27.376}
          y1={57.87}
          x2={89.571}
          y2={38.04}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.37} stopColor="#AB4EFF" />
          <stop offset={1} stopColor="#F1419E" />
        </linearGradient>
        <linearGradient
          id={`${id}_prefix__paint2_linear`}
          x1={24.776}
          y1={102.308}
          x2={62.723}
          y2={62.126}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#01C0D6" />
          <stop offset={0.77} stopColor="#77F744" />
          <stop offset={0.86} stopColor="#FFD604" />
        </linearGradient>
        <linearGradient
          id={`${id}_prefix__paint3_linear`}
          x1={61.533}
          y1={9.13}
          x2={40.19}
          y2={31.529}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FE5540" />
          <stop offset={0.69} stopColor="#FCAE1B" />
          <stop offset={1} stopColor="#FED603" />
        </linearGradient>
      </defs>
    </svg>
  );
};
