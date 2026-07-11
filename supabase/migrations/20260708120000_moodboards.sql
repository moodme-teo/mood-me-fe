-- 무드보드 저장 테이블 — 편집 완료본(캔버스 elements + 조립 이미지)을 커밋한다.
-- core_pipeline_schema(20260707120000)에서 "#23"으로 미뤄둔 테이블. 이후 병합된
-- lib/moodboard/list.ts(History 조회)와 app/api/moodboards/[moodboardId]/route.ts(PATCH upsert)가
-- 이미 이 테이블을 참조하고 있어 여기서 정식 생성한다.
-- 참고: docs/prd/mood-me-prd.md §5.7, docs/prd/moodboard-result-prd.md, docs/prd/moodboard-edit-prd.md
-- Refs #23

create table if not exists moodboards (
  id uuid primary key default gen_random_uuid(),

  -- 소유자: 회원(user_id) 또는 게스트(guest_session_id). 저장(공유) 시점 흐름에서 채워지며,
  -- 편집 자동저장(PATCH upsert)은 소유자 컬럼을 건드리지 않으므로 core 스키마의 XOR 제약과 달리
  -- 여기서는 nullable만 두고 강제 제약을 걸지 않는다 — PATCH가 만든 미소유 row를 깨뜨리지 않기 위함.
  user_id uuid references auth.users (id) on delete cascade,
  guest_session_id uuid references guest_sessions (id) on delete cascade,

  base_image_url text,                 -- 조립된 base 보드 이미지 (thumbnail로도 사용, list.ts)
  mood_profile jsonb,                  -- #36 출력: title/type_name/reading/mood_vector/keywords/sticker_phrases (list.ts에서 title/type_name 추출)
  elements jsonb not null default '[]'::jsonb,  -- MoodboardElement[] — 캔버스 진실의 원천 (convention/canvas.md)
  exported_image_data_url text,        -- exportImage() 결과 PNG (공유용)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moodboards_user_id_idx on moodboards (user_id);
create index if not exists moodboards_guest_session_id_idx on moodboards (guest_session_id);

-- 다른 코어 테이블과 동일하게 RLS는 켜두되 정책은 두지 않는다 — anon/authenticated 전면 차단,
-- 서버는 service role로만 접근한다 (#42). authenticated 본인 조회 정책은 필요 시 별도 추가.
alter table moodboards enable row level security;

-- PostgREST가 쓰는 API 롤에 테이블 권한 부여 — Supabase 대시보드로 만든 테이블은 자동 부여되지만
-- CLI(postgres 롤)로 만든 테이블은 수동 GRANT가 필요하다. RLS가 별도 계층으로 anon/authenticated를
-- 여전히 막으므로 service_role만 실제 접근한다(#42). 다른 코어 테이블과 권한 형태를 맞춘다.
grant all on table moodboards to anon, authenticated, service_role;

-- core 스키마에서 주석 처리해뒀던 FK: 생성 잡의 결과 무드보드 참조. 이제 moodboards가 존재하므로 연결한다.
alter table moodboard_generation_jobs
  drop constraint if exists moodboard_generation_jobs_result_moodboard_id_fkey;
alter table moodboard_generation_jobs
  add constraint moodboard_generation_jobs_result_moodboard_id_fkey
  foreign key (result_moodboard_id) references moodboards (id);
