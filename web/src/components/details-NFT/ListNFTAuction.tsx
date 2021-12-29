/* eslint-disable @typescript-eslint/no-empty-function */
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { date, number, object, ref, SchemaOf } from 'yup';

export interface ListNFTAuctionFormValues {
  price: number;
  startTime: Date;
  endTime: Date;
}

const validationSchema: SchemaOf<ListNFTAuctionFormValues> = object().shape({
  price: number().min(0.000001).required(),
  startTime: date()
    .min(new Date(new Date().getTime() + 10 * 1000 * 60), 'The start time should be at least ten minutes from now')
    .required(), // current  date + 5 minutes
  endTime: date().min(ref('startTime'), "End time can't be before start time").required(),
});

interface ListNFTProps {
  submitLabel: string;
  handleSubmit: (values: ListNFTAuctionFormValues, formikHelpers: FormikHelpers<ListNFTAuctionFormValues>) => void;
  initialValues?: Partial<ListNFTAuctionFormValues>;
}

export const ListNFTAuction = ({ submitLabel, handleSubmit, initialValues }: ListNFTProps) => {
  const defaultValues: ListNFTAuctionFormValues = {
    price: initialValues?.price || 0,
    startTime: initialValues?.startTime || new Date(new Date().getTime() + 10 * 1000 * 60),
    endTime: initialValues?.endTime || new Date(new Date().getTime() + 20 * 1000 * 60),
  };

  return (
    <div className="mb-2 pb-16">
      <Formik
        initialValues={defaultValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={(values, helper) => {
          handleSubmit({ ...values, startTime: new Date(values.startTime), endTime: new Date(values.endTime) }, helper);
        }}
      >
        {({ values, errors, isSubmitting, setFieldValue }: FormikProps<ListNFTAuctionFormValues>) => (
          <Form>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5 gap-3">
              <label htmlFor="price" className="flex-shrink-0 text-gray-80 font-bold text-xs uppercase ">
                auction start price
              </label>
              <div className="w-44 uppercase flex-shrink-0">
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
              <div className="w-44 uppercase flex-shrink-0">
                <ReactDatePicker
                  selected={values.endTime}
                  onChange={date => setFieldValue('endTime', date)}
                  timeInputLabel="Time:"
                  dateFormat="MM/dd/yyyy h:mm aa"
                  showTimeInput
                  className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                />
                {<div className="text-red-500 text-sm lowercase">{errors.endTime}</div>}
              </div>
            </div>
            <p className="text-gray-80 text-sm text-center py-6 px-5">
              Soundchain transaction fee and Polygon gas fees will be applied to buyer during checkout.
            </p>
            <div className="py-3 px-5 bg-gray-20">
              <MaxGasFee />
            </div>
            <PlayerAwareBottomBar>
              <Button
                className="ml-auto"
                type="submit"
                variant="list-nft"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                <div className="px-4 font-bold">{submitLabel}</div>
              </Button>
            </PlayerAwareBottomBar>
          </Form>
        )}
      </Formik>
    </div>
  );
};
