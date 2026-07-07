export default async function GeneratingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-2xl font-semibold">무드보드 생성중 · {sessionId}</p>
    </div>
  );
}
