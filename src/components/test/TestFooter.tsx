export default function TestFooter({
  label,
  onClick,
  disabled,
  errorMessage,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <footer className="border-t border-neutral-200 px-4 py-4">
      {errorMessage && (
        <p role="alert" className="mb-2 text-center text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-center rounded-xl bg-neutral-900 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
      </button>
    </footer>
  );
}
