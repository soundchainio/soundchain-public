import { Search } from 'icons/Search';
import { useEffect, useState } from 'react';

interface ExploreSearchBarProps {
  setSearchTerm: (val: string) => void;
}

const delay = 1000;

export const ExploreSearchBar = ({ setSearchTerm }: ExploreSearchBarProps) => {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(value);
    }, delay);

    return () => clearTimeout(delayDebounceFn);
  }, [value]);

  return (
    <div className="relative w-full mr-4">
      <input
        type="text"
        placeholder="Search for users or tracks..."
        onChange={e => setValue(e.target.value)}
        className="rounded-full border pl-8 border-gray-30 font-bold bg-gray-1A w-full text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold text-xs"
      />
      <Search className="absolute top-0 bottom-0 m-auto left-3" height={14} width={14} />
    </div>
  );
};
