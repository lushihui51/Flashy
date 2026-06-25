import { useQuery } from "@tanstack/react-query";

export default function Recents({
  queryKey,
  queryFn,
}: {
  queryKey: string[];
  queryFn: () => Promise<{ id: string; name: string }[] | undefined>;
}) {
  const { isPending, isError, data, error } = useQuery({
    queryKey,
    queryFn,
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
