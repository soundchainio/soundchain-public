import classNames from 'classnames';
import { Logo as OgunIcon } from 'icons/Logo';
import { useMaticUsdQuery } from 'lib/graphql';
import { currency, fixedDecimals } from 'utils/format';

interface Props {
  value?: string | number;
  className?: string;
  variant?: 'currency' | 'currency-inline'; 
}

export const Ogun = ({ value = '', className, variant }: Props) => {
  const { data: maticUsd } = useMaticUsdQuery();
  const currencyValue = currency(parseFloat(value.toString()) * parseFloat(maticUsd?.maticUsd || ''));

  switch (variant) {
    case 'currency':
      return (
        <div className={classNames('font-bold', className)}>
          <p className="text-white">
            <OgunIcon className="inline h-5 w-5" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">OGUN</span>
          </p>
          <p className="text-sm text-gray-60">{`${currencyValue}`}</p>
        </div>
      );
    case 'currency-inline':
      return (
        <p className={classNames('text-white font-bold inline-flex items-center gap-1', className)}>
          {value}
          <OgunIcon className="inline h-5 w-5" />
        </p>
      );
    default:
      return (
        <p className={classNames('font-bold text-white inline-flex items-center gap-1', className)}>
          <OgunIcon className="inline h-5 w-5" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">OGUN</span>
        </p>
      );
  }
};
