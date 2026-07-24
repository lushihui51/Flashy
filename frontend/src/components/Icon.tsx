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
    <div className="max-w-xl">
      <label className="block text-base font-semibold text-gray-900 mb-2">{label}</label>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-800">
          <DynamicIcon name={value as IconName} size={20} />
        </div>
        <span className="text-gray-400">Selected</span>
      </div>

      <div className="bg-gray-100 rounded-2xl p-3">
        <div className="grid grid-cols-10 gap-1">
          {ICON_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={value === name}
              onClick={() => onChange(name)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 transition-colors cursor-pointer ${
                value === name ? 'ring-2 ring-gray-500 bg-gray-200' : 'hover:bg-gray-200'
              }`}
            >
              <DynamicIcon name={name} size={20} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
