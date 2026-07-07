import { apiSuccess } from "@/lib/api-response";
import { MOOD_TEST_SEED } from "@/lib/mood-test/seed";

// 추구미 테스트 시드(카드 36·그림자 8·전환 32) 조회. 정적 데이터라 DB를 거치지 않는다.
export async function GET() {
  return apiSuccess(MOOD_TEST_SEED);
}
