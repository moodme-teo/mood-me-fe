import TestLayout from "@/components/test/TestLayout";

export default async function TestPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <TestLayout sessionId={sessionId} />;
}
