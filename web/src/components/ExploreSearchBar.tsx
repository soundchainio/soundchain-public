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
        onChange={(e) => setValue(e.target.value)}
        className="rounded-full border-2 pl-10 border-gray-80 font-bold bg-gray-30 w-full text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold"
      />
      <Search className="absolute top-0 bottom-0 m-auto left-3" />
    </div>

  );
};
