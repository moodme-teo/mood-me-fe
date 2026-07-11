import GeneratingLayout from "@/components/generating/GeneratingLayout";

export default async function GeneratingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <GeneratingLayout sessionId={sessionId} />;
}
