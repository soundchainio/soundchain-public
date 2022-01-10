import classNames from 'classnames';
import { Matic as MaticIcon } from 'icons/Matic';
import { useMaticUsdQuery } from 'lib/graphql';
import { currency, fixedDecimals } from 'utils/format';

interface Props {
  value?: string | number;
  className?: string;
  variant?: 'currency' | 'currency-inline';
}

export const Matic = ({ value = '', className, variant }: Props) => {
  const { data: maticUsd } = useMaticUsdQuery();
  const currencyValue = currency(parseFloat(value.toString()) * parseFloat(maticUsd?.maticUsd || ''));

  switch (variant) {
    case 'currency':
      return (
        <div className={classNames('font-bold', className)}>
          <p className="text-white">
            <MaticIcon className="inline" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">MATIC</span>
          </p>
          <p className="text-sm text-gray-60">{`${currencyValue}`}</p>
        </div>
      );
    case 'currency-inline':
      return (
        <p className={classNames('text-white font-bold inline-flex items-center gap-1', className)}>
          {fixedDecimals(value)}
          <MaticIcon className="inline" />
          <span className="text-gray-80 font-normal">{maticUsd && `≃ ${currencyValue}`}</span>
        </p>
      );
    default:
      return (
        <p className={classNames('font-bold text-white inline-flex items-center gap-1', className)}>
          <MaticIcon className="inline" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">MATIC</span>
        </p>
      );
  }
};
