import { notFound } from "next/navigation";

import MoodboardCropEditor from "@/components/board/MoodboardCropEditor";
import { getRequester } from "@/lib/auth/requester";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";
import { checkMoodboardOwner } from "@/lib/moodboard/moodboard-owner";

// getMoodboardById는 결과 페이지(generateMetadata)와 API 라우트가 쓰는 동일 함수 —
// 편집 화면은 공개 조회가 아니라서, 먼저 쿠키 기반 요청자가 이 보드의 소유자인지 확인한다.
// 소유자 불일치·보드 부재·검증 불가는 모두 404로 뭉개 존재 여부를 흘리지 않는다.
export default async function MoodboardEditPage({
  params,
}: {
  params: Promise<{ moodboardId: string }>;
}) {
  const { moodboardId } = await params;

  const requester = await getRequester();
  const ownerCheck = await checkMoodboardOwner(moodboardId, requester);
  if (!ownerCheck.ok || !ownerCheck.isOwner) {
    notFound();
  }

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
