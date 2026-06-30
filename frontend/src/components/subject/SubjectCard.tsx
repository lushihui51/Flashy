export default function SubjectCard({
  name,
  handleClickSubject,
}: {
  name: string;
  handleClickSubject: () => void;
}) {
  return (
    <div className="relative rounded-xl border p-4">
      <button
        className="absolute inset-0 z-0 cursor-pointer rounded-xl"
        onClick={handleClickSubject}
      />
      {name}
    </div>
  );
}
