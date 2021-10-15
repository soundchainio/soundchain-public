import { InputField } from 'components/InputField';
import { Form, Formik, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import React from 'react';
import { number, object, SchemaOf } from 'yup';

interface FormValues {
  price: number;
  quantity: number;
}

const validationSchema: SchemaOf<FormValues> = object().shape({
  price: number().required(),
  quantity: number().required(),
});

const initialValues: FormValues = {
  price: 0,
  quantity: 0,
};

interface SellNFTProps {
  onSetPrice: (price: number) => void;
  onSetQuantity: (quantity: number) => void;
}

export const SellNFT = ({ onSetPrice, onSetQuantity }: SellNFTProps) => {
  return (
    <div className="mb-2">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={console.log}>
        {({ values, handleChange }: FormikProps<FormValues>) => (
          <Form className="flex flex-col">
            <div className="flex">
              <div className="flex items-center justify-start w-full bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5">
                Quantity
              </div>
              <div className="flex flex-wrap items-center w-1/2 justify-end w-full bg-gray-20 uppercase py-3 pr-5">
                <InputField
                  name="quantity"
                  type="text"
                  onChange={el => {
                    handleChange(el);
                    onSetQuantity(parseInt(el.target.value));
                  }}
                />
              </div>
            </div>
            <div className="flex">
              <div className="flex items-center justify-start w-full bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5">
                Sale Price
              </div>
              <div className="flex flex-wrap items-center w-1/2 justify-end w-full bg-gray-20 uppercase py-3 pr-5">
                <InputField
                  name="price"
                  type="text"
                  icon={Matic}
                  onChange={el => {
                    handleChange(el);
                    onSetPrice(parseInt(el.target.value));
                  }}
                />
              </div>
            </div>
            <p className="mx-6 text-gray-80 text-sm py-2 text-center">
              Soundchain transaction fee and Gas fees will be applied to buyer during checkout.
            </p>
            <div className="flex">
              <div className="flex items-center justify-start bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5">
                Total
              </div>
              <div className="flex flex-wrap items-center justify-end w-full bg-gray-20 uppercase py-3 pr-5">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-gray-80 font-bold text-md leading-tight">
                  {values.price * values.quantity}
                </span>
                <div className="items-end">
                  <span className="text-gray-80 font-bold text-xs leading-tight">matic</span>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
