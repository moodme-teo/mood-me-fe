import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import MoodboardEditor from "@/components/board/MoodboardEditor";
import { getLatestGenerationJob } from "@/lib/mood-test/get-latest-generation-job";

// PRD §5.7 저장 원칙에 따라 편집 단계는 아직 실제 moodboardId가 없는 상태라
// 세션 id 기반 라우트를 그대로 이어받는다 (저장 시 /moodboard/[moodboardId]로 전환). #42, #37.
export default async function EditPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const jobResult = await getLatestGenerationJob(sessionId);
  if (!jobResult.ok || jobResult.value.status !== "completed") {
    // 아직 조립 전이거나 job이 없으면 생성중 화면으로 되돌려 폴링부터 이어가게 한다.
    redirect(`/test/${sessionId}/generating`);
  }

  // 매 진입마다 새 id를 발급한다 — "완성하고 공유하기" 전까지는 서버에 아무것도 쓰지 않으므로
  // (§5.7) 안전하지만, 새로고침 시 로컬 드래프트 연속성은 끊긴다(moodboardId가 바뀌므로).
  const moodboardId = randomUUID();

  return (
    <MoodboardEditor
      moodboardId={moodboardId}
      baseImageUrl={jobResult.value.baseImageUrl ?? ""}
      initialElements={jobResult.value.elements}
      moodProfile={jobResult.value.moodProfile}
    />
  );
}
