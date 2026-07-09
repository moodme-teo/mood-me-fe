import LoginActions from "@/components/auth/LoginActions";
import LoginError from "@/components/auth/LoginError";

// PRD 5.1 — 첫 진입을 강제하지 않는 게스트 우선 정책이라, 이 화면은 프로필 버튼을 눌러야 진입한다.
// error 쿼리 파라미터는 /auth/callback이 인증 실패/취소 시 붙여서 돌려보낸다 (PRD 10).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <p className="text-2xl font-semibold">mood·me</p>
        <p className="text-sm text-muted-foreground">
          몇 개의 질문이면 충분해요. 당신의 추구미를 무드보드로.
        </p>
      </div>

      <LoginError message={error} />

      <LoginActions />
    </div>
  );
}
