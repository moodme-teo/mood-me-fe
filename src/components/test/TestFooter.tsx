export default function TestFooter({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <footer className="border-t border-neutral-200 px-4 py-4">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center rounded-xl bg-neutral-900 py-4 text-base font-semibold text-white"
      >
        {label}
      </button>
    </footer>
  );
}
