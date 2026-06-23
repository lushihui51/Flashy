import { useQuery } from "@tanstack/react-query";
import { readSubjects } from "src/api/subject";

export default function Subjects() {
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["subjects"],
    queryFn: readSubjects,
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Subjects</h1>
      <ul>
        {data.map((subject) => (
          <li key={subject.id}>{subject.name}</li>
        ))}
      </ul>
    </div>
  );
}
