import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Ogun } from 'icons/Ogun'
import { Form, Formik } from 'formik'
import useBlockchain, { gas } from 'hooks/useBlockchain'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { Logo } from 'icons/IconSvgDirectory'
import { useEffect, useState, useMemo } from 'react'
import * as yup from 'yup'
import Web3 from 'web3'
import { mainNetwork } from 'lib/blockchainNetworks'

// Fallback Web3 instance using public RPC for gas estimation
const createFallbackWeb3 = () => {
  try {
    return new Web3(mainNetwork.rpc)
  } catch {
    return null
  }
}

export interface FormValues {
  recipient: string
  amount: string
  gasPrice?: string
  gasLimit?: number
  totalGasFee?: string
}

const validationSchema = yup.object().shape({
  recipient: yup.string().required('Please enter a valid wallet address'),
  amount: yup.string().required('Please enter an OGUN amount'),
  gasPrice: yup.string().default(''),
  gasLimit: yup.number().default(gas),
  totalGasFee: yup.string().default('0'),
})

export type InitialValues = Partial<FormValues>

interface Props {
  initialValues?: InitialValues
  handleSubmit: (values: FormValues) => void
}

export const TransferOgunForm = ({ handleSubmit }: Props) => {
  const me = useMe()
  const { web3: walletWeb3, OGUNBalance } = useWalletContext()
  const { getCurrentGasPrice } = useBlockchain()
  const [gasPrice, setGasPrice] = useState<string>('')

  // Use wallet web3 if available, otherwise use fallback public RPC
  const fallbackWeb3 = useMemo(() => createFallbackWeb3(), [])
  const web3 = walletWeb3 || fallbackWeb3

  useEffect(() => {
    const gasCheck = async () => {
      if (web3) {
        try {
          const price = await getCurrentGasPrice(web3)
          setGasPrice(price)
        } catch (err) {
          console.error('[TransferOgunForm] Gas price fetch failed:', err)
          // Set fallback gas price (~30 gwei on Polygon)
          setGasPrice('30')
        }
      }
    }
    gasCheck()
  }, [web3, getCurrentGasPrice])

  if (!me) return null

  const defaultValues: FormValues = {
    recipient: '',
    amount: '',
    gasPrice: gasPrice,
    gasLimit: gas,
  }

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Form className="flex h-full w-full flex-col justify-between" autoComplete="off">
        <div className="mb-auto flex h-full flex-col justify-between space-y-6 p-5">
          <div className="flex flex-col justify-between space-y-8">
            <div className="space-y-2">
              <span className="text-sm font-bold text-gray-80">Please enter recipient wallet address:</span>
              <InputField
                type="text"
                label="wallet address"
                name="recipient"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold uppercase text-gray-80">Amount to send:</span>
              <InputField
                type="number"
                name="amount"
                placeholder="00.00"
                min="0"
                step="0.000000000000000001"
                icon={() => <Logo />}
              />
            </div>
            <div>
              <div className="space-y-3">
                <span className="text-sm font-bold uppercase text-gray-80">Estimated Gas Fee:</span>
                <div className="flex space-x-4">
                  <div className="space-y-1">
                    <InputField type="text" label="gas price" name="gasPrice" value={gasPrice} disabled />
                  </div>
                  <div className="space-y-1">
                    <InputField type="text" label="gas limit" name="gasLimit" value={gas} disabled />
                  </div>
                </div>
              </div>
              <div className="flex content-end items-end space-y-3 self-end">
                <p className="py-6 text-left text-xs text-gray-80">
                  Gas fees are paid to crypto miners who process transactions on the Polygon network. SoundChain does
                  not profit from gas fees. <br />
                  <br />
                  Gas fees are set by the network and fluctuate based on network traffic and transaction complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between bg-black p-5">
          <Logo />
          <div className="w-6/12">
            <Button className="p-1" type="submit" variant="orange">
              SEND TOKENS
            </Button>
          </div>
        </div>
      </Form>
    </Formik>
  )
}
