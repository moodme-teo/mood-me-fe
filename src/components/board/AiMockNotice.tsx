// AI 목 모드(lib/ai-mock.ts)일 때 보드 이미지·리포트가 실제 AI 결과가 아님을 알린다.
// 노출 여부는 서버 env(AI_MOCK)라 클라이언트가 모른다 — 서버 컴포넌트인 page가 판단해 렌더한다.
// 하단 버튼을 가리더라도 누를 수 있게 pointer-events를 끈다.
export default function AiMockNotice() {
  return (
    <p
      role="status"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] left-1/2 z-40 -translate-x-1/2 rounded-full bg-surface-inverse/70 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-on-inverse backdrop-blur-sm"
    >
      AI 연결 종료로 예시 결과를 보여주는 데모예요
    </p>
  );
}
