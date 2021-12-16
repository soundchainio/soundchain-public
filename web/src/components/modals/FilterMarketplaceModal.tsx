import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import { Genre, SaleType } from 'lib/graphql';
import { useEffect, useState } from 'react';
import { GenreLabel, genres } from 'utils/Genres';

export interface FormValues {
  genres?: Genre[];
  saleType?: SaleType;
}

export const FilterModalMarketplace = () => {
  const { showMarketplaceFilter, genres: genresModalState, filterSaleType } = useModalState();
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();
  const [saleType, setSaleType] = useState<SaleType | undefined>(filterSaleType);

  const handleClose = (values: FormValues) => {
    dispatchShowFilterMarketplaceModal(false, values.genres, saleType);
  };

  useEffect(() => setSaleType(filterSaleType), [filterSaleType]);

  const handleGenreClick = (
    setFieldValue: (field: string, value: Genre[]) => void,
    newValue: Genre,
    currentValues?: Genre[],
  ) => {
    if (!currentValues) {
      setFieldValue('genres', [newValue]);
    } else if (currentValues.includes(newValue)) {
      const nextGenres = currentValues.filter(g => g !== newValue);
      setFieldValue('genres', nextGenres);
      return;
    } else {
      setFieldValue('genres', [...currentValues, newValue]);
    }
  };

  return (
    <Modal show={showMarketplaceFilter} title={'Filter'} onClose={() => handleClose}>
      <Formik<FormValues>
        initialValues={{ genres: genresModalState, saleType: filterSaleType }}
        onSubmit={values => handleClose(values)}
      >
        {({ setFieldValue, values }) => (
          <Form className="flex flex-col bg-gray-10 h-full gap-2 p-4">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-white text-xs font-bold">Sale type</span>
              <div className="flex gap-3 mb-6">
                <Badge
                  label={'Buy now'}
                  selected={saleType === SaleType.BuyNow}
                  onClick={() => setSaleType(SaleType.BuyNow)}
                />
                <Badge
                  label={'Auction'}
                  selected={saleType === SaleType.Auction}
                  onClick={() => setSaleType(SaleType.Auction)}
                />
              </div>
              <span className="text-white text-xs font-bold">
                Select Genres {values.genres && `(${values.genres.length} Selected)`}
              </span>
              <div className="flex flex-wrap gap-2">
                {genres.map(({ label, key }: GenreLabel) => (
                  <Badge
                    key={key}
                    label={label}
                    selected={values.genres ? values.genres.includes(key) : false}
                    onClick={() => handleGenreClick(setFieldValue, key, values.genres)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-around p-6 gap-6">
              <Button
                className="w-full"
                variant="cancel"
                onClick={() => dispatchShowFilterMarketplaceModal(false, genresModalState, filterSaleType)}
              >
                Cancel
              </Button>
              <Button className="w-full" type="submit" variant="approve">
                Apply
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
