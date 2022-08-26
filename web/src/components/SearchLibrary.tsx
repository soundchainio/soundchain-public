import { Search } from 'icons/Search'
import { useEffect, useState } from 'react'

interface SearchLibraryProps {
  setSearchTerm: (val: string) => void
  placeholder?: string
}

const delay = 1000

export const SearchLibrary = ({ setSearchTerm, placeholder }: SearchLibraryProps) => {
  const [value, setValue] = useState<string>('')

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(value)
    }, delay)

    return () => clearTimeout(delayDebounceFn)
  }, [value])

  return (
    <div className="relative mr-4 w-full border-t-2 border-gray-700">
      <input
        type="text"
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        className="w-full border-0 bg-black py-4 pr-16 pl-8 text-sm font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent"
      />
      <Search className="absolute top-0 bottom-0 right-8 m-auto" height={14} width={14} />
    </div>
  )
}
