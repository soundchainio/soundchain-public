import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import { DownArrow } from 'icons/DownArrow';
import { GenreLabel, genres } from 'utils/Genres';
import { SaleTypeLabel, saleTypes } from 'utils/SaleTypeLabel';

export interface FormValues {
  genres?: GenreLabel[];
  saleType?: SaleTypeLabel;
}

export const FilterModalMarketplace = () => {
  const { showMarketplaceFilter, genres: genresModalState, filterSaleType } = useModalState();
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();

  const handleClose = (values: FormValues) => {
    dispatchShowFilterMarketplaceModal(false, values.genres, values.saleType);
  };

  const handleGenreClick = (
    setFieldValue: (field: string, value: GenreLabel[]) => void,
    newValue: GenreLabel,
    currentValues?: GenreLabel[],
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
    <Modal
      show={showMarketplaceFilter}
      title={'Filter'}
      leftButton={
        <div className="flex justify-start ml-6">
          <button
            aria-label="Close"
            className="w-10 h-10 flex justify-center items-center"
            onClick={() => handleClose({ genres: genresModalState, saleType: filterSaleType })}
          >
            <DownArrow />
          </button>
        </div>
      }
      onClose={() => handleClose({ genres: genresModalState, saleType: filterSaleType })}
    >
      <Formik<FormValues>
        initialValues={{ genres: genresModalState, saleType: filterSaleType }}
        onSubmit={values => {
          handleClose(values);
        }}
      >
        {({ setFieldValue, values }) => (
          <Form className="flex flex-col bg-gray-10 h-full gap-2 p-4">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-white text-xs font-bold">Sale type</span>
              <div className="flex gap-3 mb-6">
                {saleTypes.map(sale => (
                  <Badge
                    key={sale.key}
                    label={sale.label}
                    selected={values.saleType ? values.saleType === sale : false}
                    onClick={() => setFieldValue('saleType', sale)}
                  />
                ))}
              </div>
              <span className="text-white text-xs font-bold">
                Select Genres {values.genres && `(${values.genres.length} Selected)`}
              </span>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: GenreLabel) => (
                  <Badge
                    key={genre.key}
                    label={genre.label}
                    selected={values.genres ? values.genres.includes(genre) : false}
                    onClick={() => handleGenreClick(setFieldValue, genre, values.genres)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-around p-6 gap-6">
              <Button
                className="w-full"
                variant="cancel"
                onClick={() => handleClose({ genres: genresModalState, saleType: filterSaleType })}
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
export default FilterModalMarketplace;
