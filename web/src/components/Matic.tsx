import { Matic as MaticIcon } from 'icons/Matic';
import { fixedDecimals } from 'utils/format';

interface Props {
  value?: string | number;
}

export const Matic = ({ value = '' }: Props) => {
  return (
    <div className="text-md flex items-baseline font-bold gap-1">
      <span className="text-white">
        <MaticIcon className="inline" /> {fixedDecimals(value)}
      </span>
      <span className="text-xs text-gray-80">MATIC</span>
    </div>
  );
};
