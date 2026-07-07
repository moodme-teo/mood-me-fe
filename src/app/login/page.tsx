import LoginActions from "@/components/auth/LoginActions";
import LoginError from "@/components/auth/LoginError";

// PRD 5.1 — 첫 진입을 강제하지 않는 게스트 우선 정책이라, 이 화면은 프로필 버튼을 눌러야 진입한다.
// 로직(OAuth 시작, 실패 처리)은 로그인 기능 이슈에서 연결.
export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <p className="text-2xl font-semibold">mood·me</p>
        <p className="text-sm text-neutral-500">
          몇 개의 질문이면 충분해요. 당신의 추구미를 무드보드로.
        </p>
      </div>

      <LoginError />

      <LoginActions />
    </div>
  );
}
