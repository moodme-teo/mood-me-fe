import { Button } from "@/components/ui/button";

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
    <footer className="border-t border-gray-100 px-4 py-4">
      {errorMessage && (
        <p role="alert" className="mb-2 text-center text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <Button
        type="button"
        tone="ink"
        size="lg"
        onClick={onClick}
        disabled={disabled}
        className="w-full"
      >
        {label}
      </Button>
    </footer>
  );
}
