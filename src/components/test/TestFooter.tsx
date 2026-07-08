import { Button } from "@/components/ui/button";

export default function TestFooter({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <footer className="border-t border-gray-100 px-4 py-4">
      <Button
        type="button"
        tone="ink"
        size="lg"
        onClick={onClick}
        className="w-full"
      >
        {label}
      </Button>
    </footer>
  );
}
