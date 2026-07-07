// 로그인 화면의 3개 버튼. PRD 5.1 — 카카오/구글 SSO는 로그인 기능 이슈에서 onClick을 연결한다.
export default function LoginActions() {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="w-full rounded-xl bg-[#FEE500] py-4 text-sm font-semibold text-neutral-900"
      >
        카카오로 시작하기
      </button>
      <button
        type="button"
        className="w-full rounded-xl border border-neutral-300 py-4 text-sm font-semibold text-neutral-900"
      >
        구글로 시작하기
      </button>
      <button
        type="button"
        className="w-full py-3 text-sm text-neutral-500 underline"
      >
        로그인 없이 둘러보기
      </button>
    </div>
  );
}
