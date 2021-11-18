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
    <div className="relative w-full mr-4">
      <input
        type="text"
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        className="pr-16 pl-8 border-b-0 border-t-1 border-gray-600 py-4 font-bold bg-black w-full text-gray-200 focus:ring-transparent placeholder-gray-60 text-sm"
      />
      <Search className="absolute top-0 bottom-0 m-auto right-8" height={14} width={14} />
    </div>
  );
};
