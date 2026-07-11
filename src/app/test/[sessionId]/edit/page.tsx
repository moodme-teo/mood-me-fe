import { notFound, redirect } from "next/navigation";

import MoodboardCropEditor from "@/components/board/MoodboardCropEditor";
import { getRequester } from "@/lib/auth/requester";
import { getLatestGenerationJob } from "@/lib/mood-test/get-latest-generation-job";
import { isMoodTestSessionOwner } from "@/lib/mood-test/session-owner";
import { deriveMoodboardId } from "@/lib/moodboard/moodboard-id";

// PRD §5.7 저장 원칙에 따라 편집 단계는 아직 실제 moodboard row가 없는 상태라 세션 id 기반
// 라우트를 그대로 이어받는다 (저장 시 /moodboard/[moodboardId]로 전환). #42, #37.
export default async function EditPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // 남의 세션으로 편집 화면에 들어와 그 보드 이미지를 자기 무드보드로 저장하는 경로를 막는다.
  // 소유자가 아니면 세션의 존재 여부를 흘리지 않도록 404로 답한다 (#126).
  const requester = await getRequester();
  if (!(await isMoodTestSessionOwner(sessionId, requester))) {
    notFound();
  }

  const jobResult = await getLatestGenerationJob(sessionId);
  if (!jobResult.ok || jobResult.value.status !== "completed") {
    // 아직 조립 전이거나 job이 없으면 생성중 화면으로 되돌려 폴링부터 이어가게 한다.
    redirect(`/test/${sessionId}/generating`);
  }

  // 세션에서 결정적으로 유도한다 — 재진입해도 같은 보드를 갱신한다 (moodboard-id.ts).
  const moodboardId = deriveMoodboardId(sessionId);

  return (
    <MoodboardCropEditor
      moodboardId={moodboardId}
      baseImageUrl={jobResult.value.baseImageUrl ?? ""}
      moodProfile={jobResult.value.moodProfile}
      analysisStatus={jobResult.value.analysisStatus}
      sessionId={sessionId}
    />
  );
}
