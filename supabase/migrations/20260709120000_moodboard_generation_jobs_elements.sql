-- 보드 조립(#37) 결과를 job 단계에서 보관할 자리. moodboards row는 "완성하고 공유하기"
-- 저장 시점에야 생성되므로(PRD §5.7), 그 전(편집 진입 시점)엔 job이 elements[]를 들고 있어야
-- /test/[sessionId]/edit이 조립된 보드를 그릴 수 있다. moodboards.elements와 같은 셰이프.
-- Refs #37

alter table moodboard_generation_jobs
  add column if not exists elements jsonb not null default '[]'::jsonb;
