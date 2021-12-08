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
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5 gap-3">
              <label htmlFor="price" className="flex-shrink-0 text-gray-80 font-bold text-xs uppercase ">
                auction start price
              </label>
              <div className="w-32 sm:w-52">
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
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label
                htmlFor="startTime"
                className="flex items-center justify-start flex-shrink-0 text-gray-80 font-bold text-xs"
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">start time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to start.
                  </p>
                </div>
              </label>
              <div className="w-32 sm:w-52 uppercase">
                <input
                  name="startTime"
                  type="datetime-local"
                  className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                  onChange={el => {
                    handleChange(el);
                    onSetStartTime(new Date(el.target.value));
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label
                htmlFor="endTime"
                className="flex items-center justify-start  text-gray-80 font-bold text-xs md-text-sm "
              >
                <div className="flex flex-col mr-3">
                  <p className="uppercase">end time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to end.
                  </p>
                </div>
              </label>
              <div className="w-32 sm:w-52 uppercase">
                <input
                  name="endTime"
                  type="datetime-local"
                  className="p-3 text-sm font-bold bg-gray-30 text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold rounded-md border-2 border-gray-80 w-full"
                  onChange={el => {
                    handleChange(el);
                    onSetEndTime(new Date(el.target.value));
                  }}
                />
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
          </Form>
        )}
      </Formik>
    </div>
  );
};
