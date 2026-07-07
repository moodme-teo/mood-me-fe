import MoodboardEditor from "@/components/board/MoodboardEditor";

const FALLBACK_BASE_IMAGES = [
  "/test-image/aesthetic/c18.jpg",
  "/test-image/aesthetic/c24.jpg",
  "/test-image/aesthetic/c27.jpg",
  "/test-image/aesthetic/c34.jpg",
];

function pickFallbackBaseImage(moodboardId: string) {
  const index =
    [...moodboardId].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    FALLBACK_BASE_IMAGES.length;
  return FALLBACK_BASE_IMAGES[index];
}

export default async function MoodboardEditPage({
  params,
}: {
  params: Promise<{ moodboardId: string }>;
}) {
  const { moodboardId } = await params;

  return (
    <MoodboardEditor
      moodboardId={moodboardId}
      baseImageUrl={pickFallbackBaseImage(moodboardId)}
    />
  );
}
