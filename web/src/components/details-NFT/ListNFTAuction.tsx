/* eslint-disable @typescript-eslint/no-empty-function */
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import MaxGasFee from 'components/MaxGasFee';
import { Field, Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import { date, number, object, ref, SchemaOf } from 'yup';

export interface ListNFTAuctionFormValues {
  price: number;
  startTime: Date;
  endTime: Date;
}

const validationSchema: SchemaOf<ListNFTAuctionFormValues> = object().shape({
  price: number().min(0.000001).required(),
  startTime: date()
    .min(new Date(new Date().getTime() + 5 * 1000 * 60), 'Start time should have a 5 minutes interval')
    .required(), // current  date + 5 minutes
  endTime: date().min(ref('startTime'), "End time can't be before start time").required(),
});

interface ListNFTProps {
  submitLabel: string;
  handleSubmit: (values: ListNFTAuctionFormValues, formikHelpers: FormikHelpers<ListNFTAuctionFormValues>) => void;
  initialPrice?: number;
}

export const ListNFTAuction = ({ submitLabel, handleSubmit, initialPrice }: ListNFTProps) => {
  const initialValues: ListNFTAuctionFormValues = {
    price: initialPrice || 0,
    startTime: new Date(),
    endTime: new Date(),
  };

  return (
    <div className="mb-2">
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={(values, helper) => {
          handleSubmit(
            { price: values.price, startTime: new Date(values.startTime), endTime: new Date(values.endTime) },
            helper,
          );
        }}
      >
        {({ values, errors, isSubmitting }: FormikProps<ListNFTAuctionFormValues>) => (
          <Form>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5 gap-3">
              <label htmlFor="price" className="flex-shrink-0 text-gray-80 font-bold text-xs uppercase ">
                auction start price
              </label>
              <div className="w-32 sm:w-52">
                <InputField name="price" type="number" icon={Matic} value={values.price} step="any" />
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label htmlFor="startTime" className="flex items-center justify-start text-gray-80 font-bold text-xs">
                <div className="flex flex-col mr-3">
                  <p className="uppercase">start time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to start.
                  </p>
                </div>
              </label>
              <div className="w-32 sm:w-52 uppercase">
                <Field
                  name="startTime"
                  type="datetime-local"
                  className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                />
                {<div className="text-red-500 text-sm lowercase">{errors.startTime}</div>}
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label
                htmlFor="endTime"
                className="flex items-center justify-start  text-gray-80 font-bold text-xs md:text-sm "
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">end time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to end.
                  </p>
                </div>
              </label>
              <div className="w-32 sm:w-52 uppercase">
                <Field
                  name="endTime"
                  type="datetime-local"
                  className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                />
                {<div className="text-red-500 text-sm lowercase">{errors.endTime}</div>}
              </div>
            </div>
            <p className="text-gray-80 text-sm text-center py-3 px-5">
              Soundchain transaction fee and Polygon gas fees will be applied to buyer during checkout.
            </p>
            <div className="flex py-3 px-5">
              <div className="flex items-center justify-start text-gray-80 font-bold text-xs md-text-sm uppercase">
                Total
              </div>
              <div className="flex flex-wrap items-center justify-end w-full uppercase">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-gray-80 font-bold text-md leading-tight">{values.price}</span>
                <div className="items-end">
                  <span className="text-gray-80 font-bold text-xs leading-tight">matic</span>
                </div>
              </div>
            </div>
            <div className="flex p-4">
              <MaxGasFee />
              <Button
                type="submit"
                variant="list-nft"
                onClick={() => console.log(values)}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                <div className="px-4 font-bold">{submitLabel}</div>
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
