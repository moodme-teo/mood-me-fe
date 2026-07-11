import TestLayout from "@/components/test/TestLayout";

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const { sessionId } = await params;
  const { step } = await searchParams;
  const stepValue = Array.isArray(step) ? step[0] : step;
  const initialStepIndex = Number.parseInt(stepValue ?? "0", 10);

  return (
    <TestLayout
      initialStepIndex={Number.isNaN(initialStepIndex) ? 0 : initialStepIndex}
      sessionId={sessionId}
    />
  );
}
