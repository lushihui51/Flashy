import { useQuery } from '@tanstack/react-query';
import SubjectCard from 'src/components/subject/SubjectCard';

export default function All({
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

  const handleClickSubject = (subjectId: string) => {
    console.log(`Clicked subject with ID: ${subjectId}`);
  };

  return (
    <div>
      {data?.map((item) => (
        <SubjectCard
          key={item.id}
          name={item.name}
          handleClickSubject={() => handleClickSubject(item.id)}
        />
      ))}
    </div>
  );
}
