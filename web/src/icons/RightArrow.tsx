interface Props extends React.SVGProps<SVGSVGElement> {
  fillColor?: string;
  width?: number;
  height?: number;
}

export const RightArrow = ({ fillColor = '#505050', width = 7, height = 12 }: Props) => {
  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 7 12" fill="none">
        <path
          d="M1 11L6 6L1 0.999999"
          stroke={fillColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
