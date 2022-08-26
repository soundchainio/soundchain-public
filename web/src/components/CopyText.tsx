import { Locker as LockerIcon } from 'icons/Locker'
import { Copy } from 'icons/Copy'
import { toast } from 'react-toastify'

interface CopyTextProps {
  text: string
}

export const CopyText = ({ text }: CopyTextProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    toast('Copied to clipboard')
  }

  return (
    <div className="flex w-full flex-row justify-between bg-gray-1A p-3">
      <div className="flex items-center text-sm">
        <LockerIcon />
        <span className="mx-1 w-full font-bold text-gray-80">{text}</span>
      </div>
      <button
        className="flex items-center gap-1 rounded border-2 border-gray-30 border-opacity-75 p-1 text-xxs"
        onClick={handleCopy}
        type="button"
      >
        <Copy />
        <span className="uppercase leading-none text-gray-80">copy</span>
      </button>
    </div>
  )
}
