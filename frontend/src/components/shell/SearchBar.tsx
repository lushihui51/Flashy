import { useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
  placeholder?: string;
};

// TODO(defer:search) no debounce, no results dropdown, Enter is inert.
export default function SearchBar({ placeholder = 'Search' }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  return (
    <div className="relative flex w-full items-center">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 h-4 w-4 text-(--color-text-muted)"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full bg-(--color-surface-elevated) pl-10 pr-4 text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
      />
    </div>
  );
}
