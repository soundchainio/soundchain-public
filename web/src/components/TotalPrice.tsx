import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'icons/Matic';
import { useMaticUsdQuery } from 'lib/graphql';
import { currency, fixedDecimals } from 'utils/format';

export const TotalPrice = ({ price }: { price?: string }) => {
  const maxGasFee = useMaxGasFee();
  const { data: maticUsd } = useMaticUsdQuery();

  const totalPrice = (price: number): number => {
    if (!price || !maxGasFee) {
      return 0;
    }

    return fixedDecimals(price + parseFloat(maxGasFee));
  };

  if (!price || !maticUsd) {
    return null;
  }

  return (
    <div className="font-bold">
      <p className="text-white">
        <Matic className="inline" /> {`${totalPrice(parseFloat(price))} `}
        <span className="text-xxs text-gray-80">MATIC</span>
      </p>
      <p className="text-sm text-gray-60">{`${currency(
        totalPrice(parseFloat(price) * parseFloat(maticUsd.maticUsd)),
      )}`}</p>
    </div>
  );
};
