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
    <div className="relative flex w-full items-center">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-(--color-aside)"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[46px] w-full rounded-full border-[1.5px] border-(--color-line) bg-(--color-surface) pl-[42px] pr-3.5 text-(--color-ink) placeholder:text-(--color-aside) focus:outline-none focus:ring-2 focus:ring-(--color-ink)"
      />
    </div>
  );
}
