import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'components/Matic';
import { useMaticUsdQuery } from 'lib/graphql';
import { currency, fixedDecimals } from 'utils/format';

export const TotalPrice = ({ price }: { price?: number }) => {
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
      <Matic value={totalPrice(price)} />
      <p className="text-sm text-gray-60 font-normal">{`${currency(
        totalPrice(price * parseFloat(maticUsd.maticUsd)),
      )}`}</p>
    </div>
  );
};
