import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import MaxGasFee from 'components/MaxGasFee'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import { SoundchainFee } from 'components/SoundchainFee'
import { TokenSelector } from 'components/dex/TokenSelector'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { Logo } from 'icons/Logo'
import { Matic } from 'icons/Matic'
import { useEffect, useState } from 'react'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { date, number, object, Schema, string } from 'yup'
import Web3 from 'web3'
import { CurrencyType } from 'types/CurrenctyType'
import { Token, TOKEN_INFO, getDisplaySymbol } from 'constants/tokens'
import { Zap, Info } from 'lucide-react'

export interface ListNFTBuyNowFormValues {
  salePrice: number
  selectedCurrency: string
  royalty: number
  startTime: Date
}

interface ListNFTProps {
  initialValues?: Partial<ListNFTBuyNowFormValues>
  submitLabel: string
  maxGasFee?: string
  handleSubmit: (values: ListNFTBuyNowFormValues, formikHelpers: FormikHelpers<ListNFTBuyNowFormValues>) => void
}

export const ListNFTBuyNow = ({ initialValues, maxGasFee, submitLabel, handleSubmit }: ListNFTProps) => {
  const minStartMinutes = 10
  const bufferTime = 2
  const getMinutesToDate = (minutes: number): Date => {
    return new Date(new Date().getTime() + minutes * 1000 * 60)
  }
  const validationSchema: Schema<ListNFTBuyNowFormValues> = object().shape({
    salePrice: number().required('Price is a required field'),
    royalty: number().max(100).min(0).required(),
    selectedCurrency: string().required(),
    startTime: date()
      .min(getMinutesToDate(minStartMinutes), 'The start time should be at least ten minutes from now')
      .required(),
  })

  const defaultValues = {
    salePrice: initialValues?.salePrice || 0,
    royalty: initialValues?.royalty || 0,
    selectedCurrency: 'OGUN',
    startTime: initialValues?.startTime || getMinutesToDate(minStartMinutes + bufferTime),
  }
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('OGUN')
  const [selectedToken, setSelectedToken] = useState<Token>('OGUN')
  const [showAdvancedTokens, setShowAdvancedTokens] = useState(false)

  const isMatic = selectedCurrency === 'MATIC'
  const { web3 } = useWalletContext()
  const { getRewardsRate } = useBlockchainV2()
  const [rewardRatePercentage, setRewardsRatePercentage] = useState('')

  useEffect(() => {
    const fetchRewardRate = async () => {
      const result1e4 = await getRewardsRate(web3 as Web3)
      const calculatedPercentage = (parseInt(result1e4) / 10000) * 100
      setRewardsRatePercentage(calculatedPercentage.toString())
    }
    fetchRewardRate()
  }, [setRewardsRatePercentage, getRewardsRate, web3])

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token)
    // Map token to currency type for backwards compatibility
    if (token === 'OGUN') {
      setSelectedCurrency('OGUN')
    } else {
      setSelectedCurrency('MATIC') // Default to MATIC for other tokens until L2 integration complete
    }
  }

  return (
    <div className="mb-2">
      <Formik
        initialValues={defaultValues}
        validationSchema={validationSchema}
        onSubmit={(values, helper: FormikHelpers<ListNFTBuyNowFormValues>) => {
          handleSubmit({ ...values, selectedCurrency, startTime: new Date(values.startTime) }, helper)
        }}
      >
        {({ values, errors, isSubmitting, setFieldValue }: FormikProps<ListNFTBuyNowFormValues>) => {
          return (
            <Form>
              <div className="flex flex-col items-center justify-between gap-2">
                <div className="flex items-center justify-center gap-3 py-3 px-5">
                  <label htmlFor="price" className="flex-shrink-0 text-xs font-bold text-gray-80 ">
                    What currency do you want to list your NFT in?
                  </label>
                </div>

                {/* Quick Select: OGUN or POL */}
                <div className="mt-1 mb-3 flex h-16 w-full items-center justify-center gap-3">
                  <div
                    className={
                      'flex h-full w-2/5 flex-col ' +
                      'items-center justify-center rounded-sm border-2 bg-gray-15 cursor-pointer transition-all ' +
                      (selectedToken === 'OGUN' ? 'border-[#FDEE6E] shadow-[0_0_10px_rgba(253,238,110,0.3)]' : 'border-gray-30 hover:border-gray-50')
                    }
                    onClick={() => handleTokenSelect('OGUN')}
                  >
                    <div>
                      <Logo height="15" width="18" fill="yellow" className="inline-block" />
                      <span className="ml-1 inline-block font-bold text-white">OGUN</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-80">+{rewardRatePercentage}% Reward</p>
                    </div>
                  </div>
                  <div
                    className={
                      'flex h-full w-2/5 flex-col items-center justify-center ' +
                      'rounded-sm border-2 bg-gray-15 cursor-pointer transition-all ' +
                      (selectedToken === 'MATIC' ? 'border-[#2BBDF7] shadow-[0_0_10px_rgba(43,189,247,0.3)]' : 'border-gray-30 hover:border-gray-50')
                    }
                    onClick={() => handleTokenSelect('MATIC')}
                  >
                    <div>
                      <Matic height="15" width="18" fill="yellow" className="inline-block" />
                      <span className="ml-1 inline-block font-bold text-gray-80">POL</span>
                    </div>
                  </div>
                </div>

                {/* L2 Multi-Token Expansion */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedTokens(!showAdvancedTokens)}
                  className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
                >
                  <Zap className="w-3 h-3" />
                  <span>{showAdvancedTokens ? 'Hide' : 'Show'} L2 Multi-Token Options</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">USDC + POL + OGUN</span>
                </button>

                {showAdvancedTokens && (
                  <div className="w-full px-4 pb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/5">
                      <div className="flex items-start gap-2 mb-3">
                        <Info className="w-4 h-4 text-cyan-400 mt-0.5" />
                        <p className="text-xs text-gray-400">
                          L2 tokens are converted via ZetaChain at time of purchase.
                          Buyers can pay in their preferred token.
                        </p>
                      </div>
                      <TokenSelector
                        selectedToken={selectedToken}
                        onSelectToken={handleTokenSelect}
                        showBalance={false}
                        compact={false}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between bg-gray-15 py-3 px-5">
                <label htmlFor="priceOGUN" className="flex-shrink-0 text-xs font-bold uppercase text-gray-80 ">
                  SALE PRICE
                </label>
                <div className="w-44">
                  <InputField
                    name="salePrice"
                    type="number"
                    icon={isMatic ? Matic : Logo}
                    value={values.salePrice}
                    step="any"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-15 py-3 px-5">
                <label htmlFor="startTime" className="flex items-center justify-start text-xs font-bold text-gray-80">
                  <div className="flex flex-col">
                    <p className="uppercase">start time</p>
                    <p className="font-medium" style={{ fontSize: 10 }}>
                      Set a date/time for the sale to start.
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
              <div className="flex flex-col gap-4 bg-gray-15 px-4 py-6">
                <SoundchainFee
                  isPaymentOGUN={!isMatic}
                  price={values.salePrice ?? 0}
                  rewardRatePercentage={rewardRatePercentage}
                />
              </div>
              <p className="mx-6 py-4 text-center text-xs font-bold text-gray-80">
                SoundChain transaction fee will be applied to the listing price.
              </p>
              <div className="bg-gray-15 py-3 px-5">
                <MaxGasFee maxGasFee={maxGasFee} />
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
          )
        }}
      </Formik>
    </div>
  )
}
