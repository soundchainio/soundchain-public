import { Matic } from 'icons/Matic'
import { network } from 'lib/blockchainNetworks'
import { PolygonscanResultObj } from 'lib/graphql'
import { currency, priceToShow } from 'utils/format'

interface InternalTransactionProps {
  transaction: Partial<PolygonscanResultObj>
  maticUsdValue?: string
}

export const InternalTransaction = ({ transaction, maticUsdValue }: InternalTransactionProps) => {
  return (
    <a
      href={`${network.blockExplorer}/tx/${transaction.hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-4"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-white">{transaction.hash}</p>
        <p className="text-xxs font-medium text-gray-80">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="flex items-center gap-1 text-sm font-bold text-white">
          {transaction.value && priceToShow(transaction.value)}
          <Matic height="10" width="10" />
          <span className="text-xxs font-bold uppercase text-gray-80"> Matic</span>
        </p>
        {maticUsdValue && transaction.value && (
          <p className="text-right text-xxs font-bold text-gray-50">
            {`${currency(priceToShow(transaction.value) * parseFloat(maticUsdValue))} USD`}
          </p>
        )}
      </div>
    </a>
  )
}
