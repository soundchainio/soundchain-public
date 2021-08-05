interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}

export const Badge = ({ label, selected, onClick, ...rest }: BadgeProps) => (
  <span
    className={`inline-flex items-center px-4 mr-2  py-1 rounded-full text-sm font-medium cursor-pointer ${
      selected ? 'bg-white text-gray-light' : 'bg-gray-30 text-white'
    }`}
    onClick={onClick}
    {...rest}
  >
    {label}
  </span>
);
