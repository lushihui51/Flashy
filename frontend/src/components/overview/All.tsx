import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export default function All<T>({
  queryKey,
  queryFn,
  renderItem,
}: {
  queryKey: string[];
  queryFn: () => Promise<T[] | undefined>;
  renderItem: (item: T) => ReactNode;
}) {
  const { isPending, isError, data, error } = useQuery({ queryKey, queryFn });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {data?.map(renderItem)}
    </div>
  );
}
