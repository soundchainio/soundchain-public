import { Search } from 'icons/Search'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'

interface Props {
  setSearchTerm: Dispatch<SetStateAction<string>>
}

const delay = 1000

export const SearchBar = ({ setSearchTerm }: Props) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(value)
    }, delay)

    return () => clearTimeout(delayDebounceFn)
  }, [setSearchTerm, value])

  return (
    <div className="relative w-full p-4">
      <input
        type="text"
        placeholder="Search..."
        onChange={e => setValue(e.target.value)}
        className="placeholder-semibold w-full rounded-full border border-gray-30 bg-gray-1A pl-8 text-xs font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent"
      />
      <Search className="absolute top-0 bottom-0 left-6 m-auto" height={14} width={14} />
    </div>
  )
}
