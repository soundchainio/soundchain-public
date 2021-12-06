/* eslint-disable @typescript-eslint/no-empty-function */
import { InputField } from 'components/InputField';
import { Form, Formik, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import { date, number, object, SchemaOf } from 'yup';

interface FormValues {
  price: number;
}

const validationSchema: SchemaOf<FormValues> = object().shape({
  price: number().min(0.000001).required(),
  endTime: date().min(new Date()).required(),
  startTime: date().min(new Date()).required(),
});

interface ListNFTProps {
  onSetPrice: (price: number) => void;
  onSetStartTime: (startTime: Date | null) => void;
  onSetEndTime: (endTime: Date | null) => void;
  initialPrice?: number;
}

export const ListNFTAuction = ({ initialPrice, onSetPrice, onSetStartTime, onSetEndTime }: ListNFTProps) => {
  const initialValues: FormValues = {
    price: initialPrice || 0,
  };

  return (
    <div className="mb-2">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={() => {}}>
        {({ values, handleChange }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex">
              <label
                htmlFor="price"
                className="flex items-center justify-start w-1/2 bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5"
              >
                auction start price
              </label>
              <div className="flex flex-wrap items-center w-1/2 bg-gray-20 uppercase py-3 pr-5">
                <InputField
                  name="price"
                  type="number"
                  icon={Matic}
                  onChange={el => {
                    handleChange(el);
                    onSetPrice(el.target.valueAsNumber);
                  }}
                />
              </div>
            </div>
            <div className="flex">
              <label
                htmlFor="startTime"
                className="flex items-center justify-start w-1/2 bg-gray-20 text-gray-80 font-bold text-xs md-text-sm  py-3 pl-5"
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">start time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a time to start the auction
                  </p>
                </div>
              </label>
              <div className="flex flex-wrap items-center w-1/2 justify-end bg-gray-20 uppercase py-3 pr-5">
                <input
                  name="startTime"
                  type="datetime-local"
                  className="text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold"
                  onChange={el => {
                    handleChange(el);
                    onSetStartTime(new Date(el.target.value));
                  }}
                />
              </div>
            </div>
            <div className="flex">
              <label
                htmlFor="endTime"
                className="flex items-center justify-start w-1/2 bg-gray-20 text-gray-80 font-bold text-xs md-text-sm  py-3 pl-5"
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">end time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a time to end the auction
                  </p>
                </div>
              </label>
              <div className="flex flex-wrap items-center w-1/2 justify-end bg-gray-20 uppercase py-3 pr-5">
                <input
                  name="endTime"
                  type="datetime-local"
                  className="text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold"
                  onChange={el => {
                    handleChange(el);
                    onSetEndTime(new Date(el.target.value));
                  }}
                />
              </div>
            </div>
            <p className="mx-6 text-gray-80 text-sm py-2 text-center">
              Soundchain transaction fee and Polygon gas fees will be applied to buyer during checkout.
            </p>
            <div className="flex">
              <div className="flex items-center justify-start bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5">
                Total
              </div>
              <div className="flex flex-wrap items-center justify-end w-full bg-gray-20 uppercase py-3 pr-5">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-gray-80 font-bold text-md leading-tight">{values.price}</span>
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
