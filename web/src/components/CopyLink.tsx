import { ChainLink } from 'icons/ChainLink'
import { Copy } from 'icons/Copy'
import { useState } from 'react'

interface CopyLinkProps {
  link: string
}

export const CopyLink = ({ link }: CopyLinkProps) => {
  const [copyText, setCopyText] = useState('Copy')

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopyText('Copied!')
    setTimeout(() => {
      setCopyText('Copy')
    }, 3000)
  }

  return (
    <div className="flex cursor-pointer flex-row items-center space-x-2 bg-gray-20 px-4 py-2">
      <ChainLink className="flex-shrink-0 scale-150" />
      <input
        className="no-bg-selection ml-4 mr-4 w-full truncate border-transparent bg-gray-20 py-1 text-xs text-gray-80 focus:border-transparent focus:outline-none"
        id={link}
        value={link}
        readOnly
      />
      <button className="w-30 flex items-center justify-center pr-4 pl-4 font-bold text-gray-80" onClick={handleCopy}>
        <Copy className="mr-1 h-3 w-3" /> {copyText}
      </button>
    </div>
  )
}
