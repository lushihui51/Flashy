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

  return <div>{data?.map(renderItem)}</div>;
}
