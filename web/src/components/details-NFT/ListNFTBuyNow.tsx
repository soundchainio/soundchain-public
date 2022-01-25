import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { SoundchainFee } from 'components/SoundchainFee';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { date, number, object, SchemaOf } from 'yup';

export interface ListNFTBuyNowFormValues {
  price: number;
  royalty: number;
  startTime: Date;
}

const validationSchema: SchemaOf<ListNFTBuyNowFormValues> = object().shape({
  price: number().min(0.000001).required(),
  royalty: number().max(100).min(0).required(),
  startTime: date()
    .min(new Date(new Date().getTime() + 10 * 1000 * 60), 'The start time should be at least ten minutes from now')
    .required(),
});

interface ListNFTProps {
  initialValues?: Partial<ListNFTBuyNowFormValues>;
  submitLabel: string;
  handleSubmit: (values: ListNFTBuyNowFormValues, formikHelpers: FormikHelpers<ListNFTBuyNowFormValues>) => void;
}

export const ListNFTBuyNow = ({ initialValues, submitLabel, handleSubmit }: ListNFTProps) => {
  const defaultValues = {
    price: initialValues?.price || 0,
    royalty: initialValues?.royalty || 0,
    startTime: initialValues?.startTime || new Date(new Date().getTime() + 10 * 1000 * 60),
  };

  return (
    <div className="mb-2">
      <Formik
        initialValues={defaultValues}
        validationSchema={validationSchema}
        onSubmit={(values, helper) => {
          handleSubmit({ ...values, startTime: new Date(values.startTime) }, helper);
        }}
      >
        {({ values, errors, isSubmitting, setFieldValue }: FormikProps<ListNFTBuyNowFormValues>) => {
          return (
            <Form>
              <div className="flex items-center justify-between bg-gray-15 py-3 px-5 gap-3">
                <label htmlFor="price" className="flex-shrink-0 text-gray-80 font-bold text-xs uppercase ">
                  List price
                </label>
                <div className="w-44">
                  <InputField name="price" type="number" icon={Matic} value={values.price} step="any" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-15 py-3 px-5">
                <label htmlFor="startTime" className="flex items-center justify-start text-gray-80 font-bold text-xs">
                  <div className="flex flex-col">
                    <p className="uppercase">start time</p>
                    <p className="font-medium" style={{ fontSize: 10 }}>
                      Set a date/time for the sale to start.
                    </p>
                  </div>
                </label>
                <div className="w-44 uppercase flex-shrink-0">
                  <ReactDatePicker
                    selected={values.startTime}
                    onChange={date => setFieldValue('startTime', date)}
                    timeInputLabel="Time:"
                    dateFormat="MM/dd/yyyy h:mm aa"
                    showTimeInput
                    className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                  />
                  {<div className="text-red-500 text-sm lowercase">{errors.startTime}</div>}
                </div>
              </div>
              <div className="bg-gray-15 py-3 px-5">
                <SoundchainFee price={values.price} />
              </div>
              <p className="mx-6 text-gray-80 font-bold text-xs py-4 text-center">
                Soundchain transaction fee will be applied to the listing price.
              </p>
              <div className="bg-gray-15 py-3 px-5">
                <MaxGasFee />
              </div>
              <PlayerAwareBottomBar>
                <Button
                  className="ml-auto"
                  variant="list-nft"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  type="submit"
                >
                  <div className="px-4 font-bold">{submitLabel}</div>
                </Button>
              </PlayerAwareBottomBar>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};
