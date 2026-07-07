// PRD §5.7 저장 원칙에 따라 편집 단계는 아직 실제 moodboardId가 없는 상태라
// 세션 id 기반 라우트를 그대로 이어받는다 (저장 시 /moodboard/[moodboardId]로 전환). #42, #37 논의 참고.
export default async function EditPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-2xl font-semibold">무드보드 편집 · {sessionId}</p>
    </div>
  );
}
