import classNames from 'classnames'
import { Matic as MaticIcon } from 'icons/Matic'
import { useMaticUsdQuery } from 'lib/graphql'
import { currency, fixedDecimals } from 'utils/format'

interface Props {
  value?: string | number
  className?: string
  variant?: 'currency' | 'currency-inline' | 'listing-inline'
  truncate?: string
}

export const Matic = ({ value = '', truncate, className, variant }: Props) => {
  const { data: maticUsd } = useMaticUsdQuery()
  const maticPrice = parseFloat(maticUsd?.maticUsd || '0') || 0
  const numValue = parseFloat(value.toString()) || 0
  const currencyValue = currency(numValue * maticPrice)

  switch (variant) {
    case 'currency':
      return (
        <div className={classNames('font-bold', className)}>
          <p className="text-white">
            <MaticIcon className="inline" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">MATIC</span>
          </p>
          <p className="text-sm text-gray-60">{`${currencyValue}`}</p>
        </div>
      )
    case 'currency-inline':
      return (
        <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
          <span className={truncate}>{value}</span>
          <MaticIcon className="inline" />
        </p>
      )
    case 'listing-inline':
      return (
        <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
          <MaticIcon className="inline" />
          <span className={`${truncate}`}>{fixedDecimals(value)}</span>
          <span className="hidden text-xs text-gray-80 xs:inline">MATIC</span>
        </p>
      )
    default:
      return (
        <p className={classNames('inline-flex items-center gap-1 font-bold text-white', className)}>
          <MaticIcon className="inline" /> {fixedDecimals(value)} <span className="text-xs text-gray-80">MATIC</span>
        </p>
      )
  }
}
