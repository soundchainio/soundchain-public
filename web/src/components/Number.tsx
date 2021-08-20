interface NumberProps {
  value: number;
}

export const Number = ({ value }: NumberProps) => {
  const formatted = Intl.NumberFormat().format(value);
  return <>{formatted}</>;
};
