import { Search } from 'icons/Search';
import { useEffect, useState } from 'react';

interface SearchLibraryProps {
  setSearchTerm: (val: string) => void;
  placeholder?: string;
}

const delay = 1000;

export const SearchLibrary = ({ setSearchTerm, placeholder }: SearchLibraryProps) => {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(value);
    }, delay);

    return () => clearTimeout(delayDebounceFn);
  }, [value]);

  return (
    <div className="relative w-full mr-4 border-t-2 border-gray-700">
      <input
        type="text"
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        className="pr-16 pl-8 border-0 py-4 font-bold bg-black w-full text-gray-200 focus:outline-none focus:ring-transparent placeholder-gray-60 text-sm"
      />
      <Search className="absolute top-0 bottom-0 m-auto right-8" height={14} width={14} />
    </div>
  );
};
