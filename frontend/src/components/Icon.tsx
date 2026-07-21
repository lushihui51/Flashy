import { DynamicIcon, type IconName } from 'lucide-react/dynamic';

const ICON_OPTIONS: IconName[] = [
  'book-open',
  'calculator',
  'atom',
  'globe',
  'music',
  'code-2',
  'palette',
  'flask-conical',
  'languages',
  'history',
  'dumbbell',
  'brain',
  'coffee',
  'gamepad-2',
  'camera',
  'film',
  'utensils',
  'plane',
  'rocket',
  'leaf',
];

export default function Icon({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label>{label}</label>
      <div className="flex flex-wrap gap-2">
        {ICON_OPTIONS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={value === name}
            onClick={() => onChange(value === name ? '' : name)}
            className={`p-2 rounded-lg border ${
              value === name ? 'border-black bg-main' : 'border-transparent'
            }`}
          >
            <DynamicIcon name={name} size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
