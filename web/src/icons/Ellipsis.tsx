export const Ellipsis = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width={16} height={4} viewBox="0 0 16 4" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={2} cy={2} r={2} fill="#505050" />
      <circle cx={8} cy={2} r={2} fill="#505050" />
      <circle cx={14} cy={2} r={2} fill="#505050" />
    </svg>
  );
};
