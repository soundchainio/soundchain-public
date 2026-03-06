import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Matic } from 'icons/Matic'
import { network } from 'lib/blockchainNetworks'
import { PolygonscanResultObj } from 'lib/graphql'
import { transactionDataMap } from 'types/TransactionType'
import { currency, priceToShow } from 'utils/format'

interface TransactionProps {
  transaction: PolygonscanResultObj
  maticUsdValue?: string
}

const ErrorIcon = () => {
  return <ExclamationCircleIcon width={20} height={20} color="red" />
}

export const Transaction = ({ transaction, maticUsdValue }: TransactionProps) => {
  const isError = transaction.isError === '1'
  const Icon = isError ? ErrorIcon : transaction.method && transactionDataMap[transaction.method]?.icon

  const transactionValue = priceToShow(transaction.value)
  const gasFee = priceToShow(transaction.gasUsed) * priceToShow(transaction.gasPrice)

  const getValueInMaticField = transactionValue > 0 ? transactionValue : gasFee
  const getValueInDollar = maticUsdValue && getValueInMaticField * parseFloat(maticUsdValue)

  const getValueInDollarField = getValueInDollar && getValueInDollar.toFixed(2) !== '0.00' ? getValueInDollar : 0.01

  return (
    <a
      href={`${network.blockExplorer}/tx/${transaction.hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-4"
    >
      {Icon && <Icon />}
      <div>
        <p className="text-xs font-bold text-white">
          {(transaction.method && transactionDataMap[transaction.method]?.methodName) || 'Unknown'}
        </p>
        <p className="text-xxs font-medium text-gray-80">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="flex items-center gap-1 text-sm font-bold text-white">
          {getValueInMaticField.toLocaleString('fullwide', { useGrouping: false })}
          <Matic height="10" width="10" />
          <span className="text-xxs font-bold uppercase text-gray-80"> POL</span>
        </p>
        <p className="text-right text-xxs font-bold text-gray-50">{`${currency(getValueInDollarField)} USD`}</p>
      </div>
    </a>
  )
}
