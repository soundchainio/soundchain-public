import { Search } from 'icons/Search'
import { useEffect, useMemo, useRef } from 'react'
import { debounce } from '../utils/debounce'

interface ExploreSearchBarProps {
  setSearchTerm: (val: string) => void
  searchTerm: string
}

export const ExploreSearchBar = ({ setSearchTerm, searchTerm = '' }: ExploreSearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const onSearchChanged = useMemo(
    () =>
      debounce((newValue: string) => {
        setSearchTerm(newValue)
      }, 1000),
    [setSearchTerm],
  )

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.value = searchTerm
  }, [searchTerm])

  return (
    <div className="relative w-full p-4">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search for users or tracks..."
        onChange={e => onSearchChanged(e.target.value)}
        defaultValue={searchTerm}
        className="placeholder-semibold w-full rounded-full border border-gray-30 bg-gray-1A pl-8 text-xs font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent"
      />
      <Search className="absolute top-0 bottom-0 left-6 m-auto" height={14} width={14} />
    </div>
  )
}
