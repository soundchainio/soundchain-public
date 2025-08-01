import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Matic as MaticComponent } from 'components/Matic'
import { Form, Formik } from 'formik'
import useBlockchain, { gas } from 'hooks/useBlockchain'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { Matic as MaticIcon } from 'src/icons/Matic'
import { Copy } from 'src/icons/Copy'
import { Ethereum } from 'src/icons/Ethereum'
import { Solana } from 'src/icons/Solana'
import { Base } from 'src/icons/Base'
import { Tezos } from 'src/icons/Tezos'
import { Bitcoin } from 'src/icons/Bitcoin'
import { Avalanche } from 'src/icons/Avalanche'
import { Polygon } from 'src/icons/Polygon'
import { ZetaChain } from 'src/icons/ZetaChain'
import { Dogecoin } from 'src/icons/Dogecoin'
import { Pengu } from 'src/icons/Pengu'
import { Bonk } from 'src/icons/Bonk'
import { Meateor } from 'src/icons/Meateor'
import { useEffect, useState } from 'react'
import * as yup from 'yup'

export interface FormValues {
  recipient: string
  amount: string
  gasPrice?: string
  gasLimit?: number
  totalGasFee?: string
  isBulk?: boolean
  chainId?: number
  listingType?: 'nft' | 'token' | 'bundle'
  tokenType?: string
  bundleItems?: { type: 'nft' | 'token', amount: number, token?: string }[]
}

const validationSchema: yup.ObjectSchema<FormValues> = yup.object().shape({
  recipient: yup.string().required('Please enter a valid wallet address'),
  amount: yup.string().when('isBulk', {
    is: true,
    then: yup.string().required('Enter total amount for bulk'),
    otherwise: yup.string().required('Please enter an amount'),
  }),
  gasPrice: yup.string().default(''),
  gasLimit: yup.number().default(gas),
  totalGasFee: yup.string().default('0'),
  isBulk: yup.boolean().default(false),
  chainId: yup.number().required('Select a chain'),
  listingType: yup.string().required('Select listing type'),
  tokenType: yup.string().when('listingType', {
    is: 'token',
    then: yup.string().required('Select token type'),
    otherwise: yup.string().nullable(),
  }),
  bundleItems: yup.array().when('listingType', {
    is: 'bundle',
    then: yup.array().of(yup.object().shape({
      type: yup.string().required(),
      amount: yup.number().required(),
      token: yup.string().when('type', {
        is: 'token',
        then: yup.string().required(),
        otherwise: yup.string().nullable(),
      }),
    })).min(1).required(),
    otherwise: yup.array().nullable(),
  }),
})

export type InitialValues = Partial<FormValues>

interface Props {
  initialValues?: InitialValues
  handleSubmit: (values: FormValues) => void
}

const chains = [
  { id: 137, name: 'Polygon', icon: Polygon },
  { id: 1, name: 'Ethereum', icon: Ethereum },
  { id: 43114, name: 'Avalanche', icon: Avalanche },
  { id: 8453, name: 'Base', icon: Base },
  { id: 205, name: 'Tezos', icon: Tezos },
  { id: 0, name: 'Bitcoin', icon: Bitcoin },
]

const tokens = [
  { name: 'Dogecoin', icon: Dogecoin },
  { name: 'Pengu', icon: Pengu },
  { name: 'Bonk', icon: Bonk },
  { name: 'Meateor', icon: Meateor },
]

export const TransferForm = ({ handleSubmit }: Props) => {
  const me = useMe()
  const { web3, balance, connectedChainId } = useMagicContext()
  const { getCurrentGasPrice } = useBlockchain()
  const [gasPrice, setGasPrice] = useState<string>('')
  const [isGrid, setIsGrid] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [bundleItems, setBundleItems] = useState<{ type: 'nft' | 'token', amount: number, token?: string }[]>([])

  useEffect(() => {
    if (web3) getCurrentGasPrice(web3).then(price => setGasPrice(price))
  }, [web3, getCurrentGasPrice])

  if (!me) return null

  const defaultValues: FormValues = {
    recipient: '',
    amount: '',
    gasPrice,
    gasLimit: gas,
    isBulk: false,
    chainId: connectedChainId || 137,
    listingType: 'nft',
    tokenType: '',
    bundleItems: [],
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(me.walletAddress)
    alert('Wallet address copied!')
  }

  const handleModalSubmit = (type: 'nft' | 'token' | 'bundle') => {
    setShowModal(false)
    setFieldValue('listingType', type)
    if (type === 'bundle') setShowBundleModal(true)
  }

  const handleBundleModalSubmit = () => {
    setShowBundleModal(false)
    setFieldValue('bundleItems', bundleItems)
  }

  const addBundleItem = (type: 'nft' | 'token', amount: number, token?: string) => {
    setBundleItems([...bundleItems, { type, amount, token }])
  }

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue }) => (
        <Form className="flex h-full w-full flex-col justify-between">
          <div className="mb-auto flex h-full flex-col justify-between space-y-6 p-5">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-80">Wallet Address:</span>
                <span className="text-sm text-gray-60">{me.walletAddress}</span>
                <Copy className="cursor-pointer" onClick={copyAddress} />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold text-gray-80">Transfer Type:</span>
              <label>
                <input
                  type="checkbox"
                  name="isBulk"
                  checked={values.isBulk}
                  onChange={() => setFieldValue('isBulk', !values.isBulk)}
                /> Bulk Transfer
              </label>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold uppercase text-gray-80">
                {values.isBulk ? 'Total Amount for Bulk:' : 'Amount to Send:'}
              </span>
              <InputField
                type="number"
                name="amount"
                placeholder="00.00"
                min="0"
                step="0.000000000000000001"
                icon={chains.find(c => c.id === values.chainId)?.icon || MaticIcon}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold text-gray-80">Select Chain:</span>
              <select
                name="chainId"
                value={values.chainId}
                onChange={(e) => setFieldValue('chainId', Number(e.target.value))}
              >
                {chains.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold text-gray-80">List As:</span>
              <Button
                className="p-1"
                type="button"
                variant="gray"
                onClick={() => setShowModal(true)}
              >
                {values.listingType === 'nft' ? 'NFT' : values.listingType === 'token' ? values.tokenType || 'Token' : 'Bundle'}
              </Button>
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded">
                    <h3>Choose Listing Type</h3>
                    <Button onClick={() => handleModalSubmit('nft')} variant="green">NFT</Button>
                    <Button onClick={() => handleModalSubmit('token')} variant="green">Token</Button>
                    <Button onClick={() => handleModalSubmit('bundle')} variant="green">Bundle</Button>
                    <Button onClick={() => setShowModal(false)} variant="red">Cancel</Button>
                  </div>
                </div>
              )}
              {showBundleModal && values.listingType === 'bundle' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded">
                    <h3>Add Bundle Items</h3>
                    <Button onClick={() => addBundleItem('nft', 1)} variant="green">Add NFT</Button>
                    <Button onClick={() => addBundleItem('token', 1)} variant="green">Add Token</Button>
                    <ul>
                      {bundleItems.map((item, index) => (
                        <li key={index}>{item.type} x{item.amount} {item.token}</li>
                      ))}
                    </ul>
                    <Button onClick={handleBundleModalSubmit} variant="green">Save Bundle</Button>
                    <Button onClick={() => setShowBundleModal(false)} variant="red">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="space-y-3">
                <span className="text-sm font-bold uppercase text-gray-80">Estimated Gas Fee:</span>
                <div className="flex space-x-4">
                  <InputField type="text" label="gas price" name="gasPrice" value={gasPrice} disabled />
                  <InputField type="text" label="gas limit" name="gasLimit" value={gas} disabled />
                </div>
              </div>
              <p className="py-6 text-left text-xs text-gray-80">
                Gas fees + 0.05% SoundChain fee apply. Earn OGUN rewards on bundles!
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                className="p-1"
                type="button"
                variant="gray"
                onClick={() => setIsGrid(!isGrid)}
              >
                {isGrid ? 'List View' : 'Grid View'}
              </Button>
              <Button className="p-1" type="submit" variant="orange">
                {values.isBulk ? 'Send Bulk' : 'Send Tokens'}
              </Button>
            </div>
          </div>
          <div className="flex justify-between bg-black p-5">
            <MaticComponent value={balance[values.chainId] || 0} variant="currency" />
          </div>
        </Form>
      )}
    </Formik>
  )
}
