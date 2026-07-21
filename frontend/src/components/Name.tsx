export default function Name({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label htmlFor="inputName">{label}</label>
      <input
        id="inputName"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}
