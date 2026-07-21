import type { ReactNode } from 'react';

export default function All<T>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className=" grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(renderItem)}
    </div>
  );
}
