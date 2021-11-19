import { InputField } from 'components/InputField';
import { WalletSelector } from 'components/WalletSelector';
import { Form, Formik, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import React from 'react';
import { number, object, SchemaOf } from 'yup';

interface PlaceBidProps {
  onSetBidAmount: (price: string) => void;
  bidAmount: string;
  ownerAddressAccount: string;
}

interface FormValues {
  bidAmount: number;
}

const validationSchema: SchemaOf<FormValues> = object().shape({
  bidAmount: number().min(0).required(),
});

export const PlaceBid = ({ bidAmount, ownerAddressAccount, onSetBidAmount }: PlaceBidProps) => {
  const initialValues: FormValues = {
    bidAmount: parseFloat(bidAmount),
  };

  return (
    <div className="mb-2">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={console.log}>
        {({ values, handleChange }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex p-5 bg-gray-20 text-gray-80">
              <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
                current bid
              </p>
              <p className="flex items-center justify-end w-full uppercase">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-white font-bold text-md leading-tight">
                  {parseFloat(bidAmount).toFixed(6)}
                </span>
                <span className="items-end font-bold text-xs leading-tight">matic</span>
              </p>
            </div>
            <div className="flex p-5 bg-gray-20 text-gray-80">
              <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
                time reaming
              </p>
              <p className="flex items-center w-full uppercase">
                <span className="mx-1 text-white font-bold text-md leading-tight">3 days 11 hours 34 seconds</span>
              </p>
            </div>
            <div className="flex">
              <label
                htmlFor="bidAmount"
                className="flex items-center justify-start w-full bg-gray-20 text-gray-80 font-bold text-xs md-text-sm  py-3 pl-5"
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">bid amount</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Must be at least 1% of current bid price. Enter X MATIC or more.
                  </p>
                </div>
              </label>
              <div className="flex flex-wrap items-center w-1/2 justify-end bg-gray-20 uppercase py-3 pr-5">
                <InputField
                  name="bidAmount"
                  type="number"
                  icon={Matic}
                  onChange={el => {
                    handleChange(el);
                    onSetBidAmount(el.target.value);
                  }}
                />
              </div>
            </div>

            <WalletSelector className="mb-10" ownerAddressAccount={ownerAddressAccount} />
          </Form>
        )}
      </Formik>
    </div>
  );
};
