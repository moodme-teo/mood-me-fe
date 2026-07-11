-- 세션당 진행 중(queued·processing) job을 하나로 강제하는 부분 unique 인덱스.
-- 애플리케이션 레벨의 "확인 후 생성" 방어(createGenerationJob)는 select-then-insert라
-- 완전히 동시에 들어온 두 요청 사이에서는 경쟁 상태(TOCTOU)로 뚫릴 수 있다 — 실측(#115
-- 검증 스크립트)으로 재현됨: 순차 재진입은 막히지만 진짜 동시 호출은 job이 2개 생겼다.
-- DB 제약이 마지막 방어선이다. 위반 시 애플리케이션이 23505(unique_violation)를 잡아
-- 기존 job을 다시 조회해 그걸 돌려준다(generate-mood-analysis.ts).
-- Refs #115

create unique index if not exists moodboard_generation_jobs_one_active_per_session
  on moodboard_generation_jobs (test_session_id)
  where status in ('queued', 'processing');
