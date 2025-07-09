/* eslint-disable @typescript-eslint/no-empty-function */
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import MaxGasFee from 'components/MaxGasFee'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import { SoundchainFee } from 'components/SoundchainFee'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { Logo } from 'icons/Logo'
import { Matic } from 'icons/Matic'
import { useState } from 'react'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { date, number, object, SchemaOf } from 'yup'

export interface ListNFTAuctionFormValues {
  price: number
  startTime: Date
  endTime: Date
}

interface ListNFTProps {
  submitLabel: string
  handleSubmit: (values: ListNFTAuctionFormValues, formikHelpers: FormikHelpers<ListNFTAuctionFormValues>) => void
  initialValues?: Partial<ListNFTAuctionFormValues>
}

export const ListNFTAuction = ({ submitLabel, handleSubmit, initialValues }: ListNFTProps) => {
  const [isPaymentOGUN, setIsPaymentOGUN] = useState(false)
  const minStartMinutes = 10
  const minEndMinutes = 20
  const bufferTime = 2
  const getMinutesToDate = (minutes: number): Date => {
    return new Date(new Date().getTime() + minutes * 1000 * 60)
  }
  const validationSchema: SchemaOf<ListNFTAuctionFormValues> = object().shape({
    price: number().min(0.000001).required(),
    startTime: date()
      .min(getMinutesToDate(minStartMinutes), 'The start time should be at least ten minutes from now')
      .required(),
    endTime: date()
      .min(getMinutesToDate(minEndMinutes), 'End time needs to be at least 5 minutes after start time')
      .required(),
  })
  const defaultValues: ListNFTAuctionFormValues = {
    price: initialValues?.price || 0,
    startTime: initialValues?.startTime || getMinutesToDate(minStartMinutes + bufferTime),
    endTime: initialValues?.endTime || getMinutesToDate(minEndMinutes + bufferTime),
  }

  return (
    <div className="mb-2 pb-16">
      <Formik
        initialValues={defaultValues}
        validationSchema={validationSchema}
        onSubmit={(values, helper) => {
          handleSubmit({ ...values, startTime: new Date(values.startTime), endTime: new Date(values.endTime) }, helper)
        }}
      >
        {({ values, errors, isSubmitting, setFieldValue }: FormikProps<ListNFTAuctionFormValues>) => (
          <Form placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
            <div className="flex items-center justify-between gap-3 bg-gray-20 py-3 px-5">
              <label htmlFor="price" className="flex-shrink-0 text-xs font-bold uppercase text-gray-80 ">
                auction start price
              </label>
              <div className="w-44 flex-shrink-0 uppercase">
                <InputField
                  name="price"
                  type="number"
                  icon={isPaymentOGUN ? Logo : Matic}
                  value={values.price}
                  step="any"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 bg-gray-20 py-3 px-5">
              <label htmlFor="price" className="flex-shrink-0 text-xs font-bold uppercase text-gray-80 ">
                Token for payment
              </label>
              <div className="w-44 flex-shrink-0 uppercase">
                <div className="relative">
                  <select
                    className="w-full rounded-lg border-0 bg-gray-25 pl-8 text-xs font-bold text-gray-80"
                    name="Wallet"
                    id="wallet"
                    onChange={e => setIsPaymentOGUN(e.target.value === 'OGUN')}
                    value={isPaymentOGUN ? 'OGUN' : 'MATIC'}
                  >
                    <option value="MATIC">MATIC</option>
                  </select>
                  <span className="pointer-events-none absolute top-2 left-2">
                    {isPaymentOGUN ? (
                      <Logo id="soundchain-wallet" height="16" width="16" />
                    ) : (
                      <Matic height="16" width="16" />
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label htmlFor="startTime" className="flex items-center justify-start text-xs font-bold text-gray-80">
                <div className="mr-3 flex flex-col">
                  <p className="uppercase">start time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to start.
                  </p>
                </div>
              </label>
              <div className="w-44 flex-shrink-0 uppercase">
                <ReactDatePicker
                  selected={values.startTime}
                  onChange={date => setFieldValue('startTime', date)}
                  timeInputLabel="Time:"
                  dateFormat="MM/dd/yyyy h:mm aa"
                  showTimeInput
                  className="placeholder-semibold w-full rounded-md border-2 border-gray-80 bg-gray-30 p-3 text-sm font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent"
                />
                {typeof errors.startTime === 'string' && <div className="text-sm lowercase text-red-500">{errors.startTime}</div>}
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-20 py-3 px-5">
              <label htmlFor="endTime" className="flex items-center justify-start text-xs font-bold text-gray-80">
                <div className="mr-3 flex flex-col">
                  <p className="uppercase">end time</p>
                  <p className="font-medium" style={{ fontSize: 10 }}>
                    Set a date/time for the auction to end.
                  </p>
                </div>
              </label>
              <div className="w-44 flex-shrink-0 uppercase">
                <ReactDatePicker
                  selected={values.endTime}
                  onChange={date => setFieldValue('endTime', date)}
                  timeInputLabel="Time:"
                  dateFormat="MM/dd/yyyy h:mm aa"
                  showTimeInput
                  className="placeholder-semibold w-full rounded-md border-2 border-gray-80 bg-gray-30 p-3 text-sm font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent"
                />
                {typeof errors.endTime === 'string' && <div className="text-sm lowercase text-red-500">{errors.endTime}</div>}
              </div>
            </div>
            <div className="bg-gray-20 py-3 px-5">
              <SoundchainFee price={values.price} isPaymentOGUN={false} />
            </div>
            <p className="py-6 px-5 text-center text-sm text-gray-80">
              SoundChain transaction fee will be applied to the listing price.
            </p>
            <div className="bg-gray-20 py-3 px-5">
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
  )
}
