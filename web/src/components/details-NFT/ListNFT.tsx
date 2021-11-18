import { InputField } from 'components/InputField';
import { Form, Formik, FormikProps } from 'formik';
import { Matic } from 'icons/Matic';
import { number, object, SchemaOf } from 'yup';

interface FormValues {
  price: number;
  royalty: number;
}

const validationSchema: SchemaOf<FormValues> = object().shape({
  price: number().min(0.000001).required(),
  royalty: number().max(100).min(0).required(),
});

interface ListNFTProps {
  onSetPrice: (price: number) => void;
  initialPrice?: number;
}

export const ListNFT = ({ onSetPrice, initialPrice }: ListNFTProps) => {
  const initialValues: FormValues = {
    price: initialPrice || 0,
    royalty: 0,
  };

  return (
    <div className="mb-2">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={console.log}>
        {({ values, handleChange }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex">
              <label
                htmlFor="price"
                className="flex items-center justify-start w-full bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-3 pl-5"
              >
                List Price
              </label>
              <div className="flex flex-wrap items-center w-1/2 justify-end bg-gray-20 uppercase py-3 pr-5">
                <InputField
                  name="price"
                  type="number"
                  icon={Matic}
                  onChange={el => {
                    handleChange(el);
                    onSetPrice(parseFloat(el.target.value));
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
