import { Matic } from 'components/Matic'
import { useMaxGasFee } from 'hooks/useMaxGasFee'
import Image from 'next/image'

interface MaxGasFeeProps {
  maxGasFee?: string
  text?: string
}

export default function MaxGasFee(props: MaxGasFeeProps) {
  const { text = 'Max gas fee', maxGasFee } = props
  const defaultMaxGasFee = useMaxGasFee()
  return (
    <div className="flex justify-between text-gray-80">
      <p className="flex items-center gap-2 text-xs font-bold uppercase">
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> {text}
      </p>
      <Matic value={maxGasFee || defaultMaxGasFee} variant="currency-inline" />
    </div>
  )
}
