import { notFound } from "next/navigation";

import MoodboardCropEditor from "@/components/board/MoodboardCropEditor";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";

// getMoodboardById는 결과 페이지(generateMetadata)와 API 라우트가 쓰는 동일 함수 —
// Supabase 시크릿이 없는 환경(E2E/CI)에서는 자동으로 mock 데이터로 폴백하므로
// 이 서버 컴포넌트는 별도 mock 처리 없이도 항상 안전하게 렌더된다.
export default async function MoodboardEditPage({
  params,
}: {
  params: Promise<{ moodboardId: string }>;
}) {
  const { moodboardId } = await params;

  const result = await getMoodboardById(moodboardId);
  if (!result.ok) {
    notFound();
  }

  const moodboard = result.value;

  return (
    <MoodboardCropEditor
      moodboardId={moodboardId}
      baseImageUrl={moodboard.baseImageUrl}
      moodProfile={moodboard.moodProfile}
      initialEditState={moodboard.editState}
    />
  );
}
