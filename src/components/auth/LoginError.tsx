// 인증 실패/취소 시 노출할 에러 슬롯 (PRD 5.1 예외 케이스). 토스트 컴포넌트가 아직 없어서
// 우선 인라인 메시지로 처리 — 공통 토스트가 생기면 그걸로 교체한다.
type Props = {
  message?: string;
};

export default function LoginError({ message }: Props) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </p>
  );
}
