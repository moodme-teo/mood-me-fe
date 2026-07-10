-- 생성은 이미지(assembleBoard)·분석(runReportAnalysis) 두 독립된 갈래인데, 지금은 job.status
-- 하나로만 다뤄서 분석 실패가 흔적도 없이 삼켜진다. analysis_status를 별도로 둬 이미지 실패와
-- 분석 실패를 구별하고, "아직 안 끝남"과 "실패"도 구별한다 (#122, PRD §7 초안 §10.3).
--
-- moodboards.test_session_id: 저장된 무드보드에서 "분석 다시 시도"를 하려면 원본 journey가
-- 필요한데, moodboard_generation_jobs.result_moodboard_id가 그 역할로 스키마에 있었지만 코드
-- 어디서도 채운 적이 없다(죽은 컬럼). 대신 moodboards가 직접 test_session_id를 들고 있게 한다
-- — 최초 저장 시 한 번만 세팅하고 이후 재편집 저장에서는 건드리지 않는다(소유자 컬럼과 같은 불변 패턴).
--
-- moodboards.analysis_status: 저장 시점에 job에서 복사되고, 이후 "분석 다시 시도"는 job을
-- 거치지 않고 이 컬럼과 mood_profile을 직접 갱신한다 — elements·base_image_url·exported_image_data_url이
-- 저장 후 moodboard 자신이 원본이 되는 기존 패턴과 동일하다.
-- Refs #122

alter table moodboard_generation_jobs
  add column if not exists analysis_status text not null default 'queued'
  check (analysis_status in ('queued', 'processing', 'completed', 'failed'));

alter table moodboards
  add column if not exists test_session_id uuid references mood_test_sessions (id);

alter table moodboards
  add column if not exists analysis_status text
  check (analysis_status is null or analysis_status in ('queued', 'processing', 'completed', 'failed'));

create index if not exists moodboards_test_session_id_idx
  on moodboards (test_session_id);
