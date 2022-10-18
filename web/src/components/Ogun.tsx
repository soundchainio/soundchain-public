import classNames from 'classnames'
import { config } from 'config'
import { Logo as OgunIcon } from 'icons/Logo'
import { currency, fixedDecimals } from 'utils/format'

interface Props {
  value?: string | number
  className?: string
  variant?: 'currency' | 'currency-inline'
  showBonus?: boolean
  rewardRatePercentage?: string
}

export const Ogun = ({ value = '', className, variant, showBonus, rewardRatePercentage }: Props) => {
  const moneyValue = fixedDecimals(value)
  if (!rewardRatePercentage) {
    rewardRatePercentage = '0'
  }
  const fullNFTPrice = moneyValue / config.soundchainFee
  const ogunBonus = Math.min(fixedDecimals(fullNFTPrice * (parseFloat(rewardRatePercentage) / 100)), 1000)

  switch (variant) {
    case 'currency':
      return (
        <div className={classNames('flex items-center font-bold', className)}>
          <OgunIcon id="ogun-token" className="mr-[10px] inline h-6 w-6" />
          {showBonus ? (
            <span className="flex items-center text-xl text-slate-50">
              {`${fixedDecimals(moneyValue - ogunBonus)}`}
              <span className="ml-[4px] mt-[4px] text-sm font-semibold text-gray-60">OGUN</span>
            </span>
          ) : (
            <span className="text-sm text-slate-50">{`${moneyValue} OGUN`}</span>
          )}
        </div>
      )
    case 'currency-inline':
      return (
        <div className="align-center flex flex-col">
          <div className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
            {showBonus ? (
              <p className="text-sm ">{`${fixedDecimals(moneyValue - ogunBonus)}`}</p>
            ) : (
              <p className="text-sm ">{`${currency(moneyValue)}`}</p>
            )}{' '}
            <OgunIcon id="ogun-token" className="inline h-5 w-5" />
          </div>
        </div>
      )
    default:
      return (
        <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
          <OgunIcon id="ogun-token" className="inline h-5 w-5" /> {fixedDecimals(value)}{' '}
          <span className="text-xs text-gray-80">OGUN</span>
        </p>
      )
  }
}
