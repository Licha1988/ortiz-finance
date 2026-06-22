type EmptyStateProps = {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 transition hover:border-violet-500 hover:text-violet-950"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
