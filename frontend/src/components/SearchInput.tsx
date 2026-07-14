import {Search, X} from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
}

export default function SearchInput({value, onChange, placeholder, id, className = ''}: SearchInputProps) {
  return <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
    <input
      id={id}
      type="text"
      role="searchbox"
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="mobile-search-control h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 pl-9 pr-9 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/10"
    />
    {value && <button type="button" onClick={() => onChange('')} aria-label="清除搜索" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"><X size={12} /></button>}
  </div>;
}
