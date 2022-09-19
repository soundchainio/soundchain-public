import { useEffect, useState } from 'react'
import { FilterWrapperProps } from 'components/ExplorePageFilterWrapper/ExplorePageFilterWrapper'
import PageFilterWrapper from 'components/PageFilterWrapper/PageFilterWrapper'

interface LibrarySearchBarProps extends Omit<FilterWrapperProps, 'selectedTab' | 'setSelectedTab' | 'totalCount'> {
  setSearchTerm: (val: string) => void
  placeholder?: string
  children?: React.ReactNode
}

const delay = 1000

export const LibrarySearchBar = (props: LibrarySearchBarProps) => {
  const { setSearchTerm, placeholder, sorting, setSorting, setIsGrid, isGrid } = props

  const [value, setValue] = useState('')

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(value)
    }, delay)

    return () => clearTimeout(delayDebounceFn)
  }, [setSearchTerm, value])

  return (
    <>
      <div className="relative flex w-full items-center bg-gray-15">
        <input
          type="text"
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          className="h-[70px] w-full border-0 bg-transparent text-sm font-bold text-gray-200 placeholder-gray-60 focus:outline-none focus:ring-transparent md:w-[250%]"
        />
        <PageFilterWrapper label="" sorting={sorting} setSorting={setSorting} setIsGrid={setIsGrid} isGrid={isGrid} />
      </div>
    </>
  )
}
