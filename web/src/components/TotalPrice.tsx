import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { useMaxGasFee } from 'hooks/useMaxGasFee'
import { useMaticUsdQuery } from 'lib/graphql'
import { currency, fixedDecimals } from 'utils/format'

interface TotalPriceProps {
  price?: number
  isPaymentOGUN?: boolean
}

export const TotalPrice = ({ price, isPaymentOGUN }: TotalPriceProps) => {
  const maxGasFee = useMaxGasFee()
  const { data: maticUsd } = useMaticUsdQuery()

  const totalPrice = (price: number): number => {
    if (!price || !maxGasFee) {
      return 0
    }

    return fixedDecimals(price + parseFloat(maxGasFee))
  }

  if (!price || !maticUsd) {
    return null
  }

  return (
    <div className="font-bold">
      {isPaymentOGUN ? <Ogun value={fixedDecimals(price)} /> : <Matic value={totalPrice(price)} />}
      {!isPaymentOGUN && (
        <p className="text-sm font-normal text-gray-60">{`${currency(
          totalPrice(price * parseFloat(maticUsd.maticUsd)),
        )}`}</p>
      )}
    </div>
  )
}
