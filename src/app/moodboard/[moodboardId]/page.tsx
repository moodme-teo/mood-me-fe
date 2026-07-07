export default async function MoodboardResultPage({
  params,
}: {
  params: Promise<{ moodboardId: string }>;
}) {
  const { moodboardId } = await params;

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-2xl font-semibold">결과물 · {moodboardId}</p>
    </div>
  );
}
