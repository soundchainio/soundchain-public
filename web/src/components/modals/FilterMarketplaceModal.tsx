import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import { Genre } from 'lib/graphql';
import React from 'react';
import { GenreLabel, genres } from 'utils/Genres';

export interface FormValues {
  title: string;
  description: string;
  artist?: string;
  album?: string;
  copyright?: string;
  releaseYear?: number;
  genres?: Genre[];
  artworkUrl?: string;
  royalty: number;
}

export const FilterModalMarketplace = () => {
  const { showMarketplaceFilter } = useModalState();
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();

  const handleClose = () => {
    dispatchShowFilterMarketplaceModal(false);
  };

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
    <Modal
      show={showMarketplaceFilter}
      title={'Filter'}
      onClose={handleClose}
      leftButton={
        <button className="p-2 ml-3 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <Formik<FormValues> initialValues={{} as any} onSubmit={console.log}>
        {({ setFieldValue, values }) => (
          <Form className="flex flex-col bg-gray-10 h-full gap-2 p-4">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-white text-xs font-bold">Sale type</span>
              <div className="flex gap-6">
                <Button className="" variant="cancel" onClick={handleClose}>
                  Buy now
                </Button>
                <Button className="" variant="cancel" onClick={console.log}>
                  Auction
                </Button>
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
                    className=""
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-around p-6 gap-6">
              <Button className="w-full" variant="cancel" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="w-full" variant="approve" onClick={console.log}>
                Apply
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
