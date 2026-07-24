// Inline content only ("Name (required)") for embedding inside a component
// that renders its own <label> element, like Select or KeyValueList.
export function FieldLabelContent({ name, mandatory }: { name: string; mandatory: boolean }) {
  return (
    <>
      {name}
      {mandatory && <span className="font-normal text-gray-400"> (required)</span>}
    </>
  );
}

export default function FieldLabel({ name, mandatory }: { name: string; mandatory: boolean }) {
  return (
    <label className="block font-semibold text-gray-900 mb-2">
      <FieldLabelContent name={name} mandatory={mandatory} />
    </label>
  );
}
