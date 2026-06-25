import { editableInput } from "@/lib/ui/tokens";

type ParamFieldProps = {
  label: string;
  helper?: string;
  source?: string;
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
};

export default function ParamField({
  label,
  helper,
  source,
  value,
  onChange,
  format,
  parse,
}: ParamFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {helper ? <span className="block text-[11px] text-stone-400">{helper}</span> : null}
      {source ? <span className="block text-[10px] italic text-stone-400">{source}</span> : null}
      <input
        type="text"
        defaultValue={format(value)}
        key={`${label}-${value}`}
        onBlur={(event) => {
          const parsed = parse(event.target.value);
          if (parsed !== null) onChange(parsed);
        }}
        className={`w-full rounded-lg border border-stone-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-stone-900 ${editableInput}`}
      />
    </label>
  );
}
