import { useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
  placeholder?: string;
};

// No debounce, no results dropdown; Enter is inert.
export default function SearchBar({ placeholder = 'Search' }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  return (
    // A label, so a click on the icon or the padding still lands in the input.
    <label className="flex h-field w-full cursor-text items-center gap-2.75 rounded-full bg-(--color-surface) pr-3.5 pl-3.25 outlined-line focus-within:ring-2 focus-within:ring-(--color-ink)">
      <Search aria-hidden="true" className="size-icon shrink-0 text-(--color-aside)" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-(--color-ink) placeholder:text-(--color-aside) focus:outline-none"
      />
    </label>
  );
}
