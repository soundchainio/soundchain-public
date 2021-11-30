/* eslint-disable @typescript-eslint/no-empty-function */
import { InputField } from 'components/InputField';
import { TimeCounter } from 'components/TimeCounter';
import { WalletSelector } from 'components/WalletSelector';
import { Form, Formik, FormikProps } from 'formik';
import { Auction } from 'icons/Auction';
import { Matic } from 'icons/Matic';
import React from 'react';
import { number, object, SchemaOf } from 'yup';

interface PlaceBidProps {
  highestBid: string;
  onSetBidAmount: (price: number) => void;
  bidAmount: number;
  ownerAddressAccount: string;
  endingTime: number;
  reservePrice: string;
  countBids: number;
  startTime: number;
}

interface FormValues {
  bidAmount: number;
}

const validationSchema: SchemaOf<FormValues> = object().shape({
  bidAmount: number().min(0).required(),
});

export const PlaceBid = ({
  highestBid,
  bidAmount,
  ownerAddressAccount,
  onSetBidAmount,
  endingTime,
  reservePrice,
  countBids,
  startTime,
}: PlaceBidProps) => {
  const initialValues: FormValues = {
    bidAmount,
  };

  const currentBid = highestBid === '0' ? reservePrice : (parseFloat(highestBid) / 1e18).toFixed(6);
  const hasStarted = startTime <= new Date().getTime() / 1000;

  return (
    <div className="mb-2">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={() => {}}>
        {({ handleChange, setFieldValue }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex p-5 bg-gray-20 text-gray-80">
              <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
                current bid
              </p>
              <p className="flex items-center justify-end w-full uppercase">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-white font-bold text-md leading-tight">{currentBid}</span>
                <span className="items-end font-bold text-xs leading-tight">matic</span>
                <span className="text-xs text-blue-400 font-bold leading-tight pl-1">({countBids} bids)</span>
              </p>
            </div>
            {!hasStarted && <Timer title="starting in" time={startTime} />}
            {hasStarted && (
              <>
                <Timer title="time remaining" time={endingTime} />
                <WalletSelector ownerAddressAccount={ownerAddressAccount} />
                <div className="flex">
                  <label
                    htmlFor="bidAmount"
                    className="flex items-center justify-start w-full bg-gray-20 text-gray-80 font-bold text-xs md-text-sm  py-3 pl-5"
                  >
                    <div className="flex flex-col mr-3 gap-1">
                      <div className="flex gap-2">
                        <Auction className="h-4 w-4" purple={false} />
                        <p className="uppercase">bid amount</p>
                      </div>
                      <p className="font-medium" style={{ fontSize: 10 }}>
                        Must be at least 1% of current bid price. Enter{' '}
                        <span
                          className="text-white font-bold cursor-pointer"
                          onClick={() => {
                            const amount = (parseFloat(currentBid) * 1.015).toFixed(6);
                            onSetBidAmount(parseFloat(amount));
                            setFieldValue('bidAmount', amount);
                          }}
                        >
                          {(parseFloat(currentBid) * 1.015).toFixed(6)}
                        </span>{' '}
                        MATIC or more.
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
                        onSetBidAmount(parseFloat(el.target.value));
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};

interface TimerProps {
  title: string;
  time: number;
}

const Timer = ({ title, time }: TimerProps) => {
  return (
    <div className="flex p-5 bg-gray-20 text-gray-80">
      <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">{title}</p>
      <div className="flex items-center w-full justify-end">
        <span className="mx-1 text-white font-bold text-xs leading-tight">
          <TimeCounter date={new Date(time * 1000)}>
            {(days, hours, minutes, seconds) => (
              <div>
                {days !== 0 && (
                  <>
                    {days} <span className="text-gray-80">days </span>
                  </>
                )}
                {hours !== 0 && (
                  <>
                    {hours} <span className="text-gray-80">hours </span>
                  </>
                )}
                {minutes !== 0 && (
                  <>
                    {minutes} <span className="text-gray-80">minutes </span>
                  </>
                )}
                {seconds !== 0 && (
                  <>
                    {seconds} <span className="text-gray-80">seconds </span>
                  </>
                )}
              </div>
            )}
          </TimeCounter>
        </span>
      </div>
    </div>
  );
};
