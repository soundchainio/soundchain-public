import { IconProps } from 'icons/types/IconProps';

export const PurpleGradient = ({ id }: IconProps) => {
  return (
    <defs>
      <linearGradient
        id={`${id}purple-gradient`}
        x1="0.259"
        x2="14.056"
        y1="11.986"
        y2="8.171"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#AB4EFF"></stop>
        <stop offset="1" stopColor="#F1419E"></stop>
      </linearGradient>
    </defs>
  );
};
