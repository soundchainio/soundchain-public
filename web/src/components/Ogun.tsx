import classNames from 'classnames';
import { Logo as OgunIcon } from 'icons/Logo';
import { useState } from 'react';
import { currency, fixedDecimals } from 'utils/format';

interface Props {
  value?: string | number;
  className?: string;
  variant?: 'currency' | 'currency-inline';
  showBonus?: boolean;
}

export const Ogun = ({ value = '', className, variant, showBonus }: Props) => {
  const moneyValue = fixedDecimals(value);

  const tenPercent = Math.min(fixedDecimals(moneyValue * 0.1), 1000);

  const [showTip, setShowTip] = useState(false);

  switch (variant) {
    case 'currency':
      return (
        <div className={classNames('font-bold', className)}>
          <p className="text-white">
            <OgunIcon id="ogun-token" className="inline h-5 w-5" />{' '}
            {showBonus ? (
              <span className="text-sm text-gray-60">{`${fixedDecimals(moneyValue - tenPercent)} OGUN`}</span>
            ) : (
              <span className="text-sm text-gray-60">{`${moneyValue} OGUN`}</span>
            )}
          </p>
        </div>
      );
    case 'currency-inline':
      return (
        <div className="align-center flex flex-col">
          <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
            {showBonus ? (
              <p className="text-sm ">{`${fixedDecimals(moneyValue - tenPercent)}`}</p>
            ) : (
              <p className="text-sm ">{`${currency(moneyValue)}`}</p>
            )}{' '}
            <OgunIcon id="ogun-token" className="inline h-5 w-5" />
          </p>
          <p
            className="buy-now-gradient text-xxs font-bold"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            {`+${fixedDecimals(tenPercent)} BONUS`}
          </p>
          <div
            className={
              'absolute ml-[-40px] mt-10 w-32 rounded-md bg-gray-30 p-2 opacity-70' +
              (showTip ? ' visible' : ' invisible')
            }
          >
            <p className="m-2 text-xxs text-white opacity-100">
              When you buy with OGUN, you get a 10% bonus per NFT, up to 1000
            </p>
          </div>
        </div>
      );
    default:
      return (
        <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
          <OgunIcon id="ogun-token" className="inline h-5 w-5" /> {fixedDecimals(value)}{' '}
          <span className="text-xs text-gray-80">OGUN</span>
        </p>
      );
  }
};
