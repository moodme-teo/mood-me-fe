import ProfileMenu from "@/components/auth/ProfileMenu";
import { createClient } from "@/lib/supabase/server";

// 저장된 무드보드 유무에 따른 메인/홈(History) 분기는 후속 이슈에서 구현.
// 지금은 라우트 골격 확인용으로 두 상태가 이 경로 하나를 공유한다는 것만 표시한다.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end px-4 py-3">
        <ProfileMenu isLoggedIn={!!user} />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-2xl font-semibold">메인 / 홈(History)</p>
      </div>
    </div>
  );
}
