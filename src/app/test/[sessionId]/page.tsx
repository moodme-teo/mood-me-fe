export default async function TestPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-2xl font-semibold">추구미 테스트 · {sessionId}</p>
    </div>
  );
}
