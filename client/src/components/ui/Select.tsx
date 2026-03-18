import { CaretDown } from '@phosphor-icons/react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export default function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`appearance-none bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-900 focus:outline-none w-full ${error ? 'ring-red-400 focus:ring-red-500' : ''} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
