interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:outline-none placeholder:text-gray-400 ${error ? 'ring-red-400 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
