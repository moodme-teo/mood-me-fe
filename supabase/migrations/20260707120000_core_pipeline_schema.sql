-- 핵심 파이프라인 스키마: 게스트 세션 · 프로필 · 추구미 테스트 세션 · 무드보드 생성 잡
-- 참고: docs/prd/mood-me-prd.md (3/7/8/§5.7), docs/work/todo/mood-test-questions.md
-- Refs #42

-- 1) 게스트 세션 — PRD POST /guest-sessions(F-02) 발급 대상
create table guest_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')  -- 만료 정책 미확정(PRD 13-1), 임시값
);
alter table guest_sessions enable row level security;

-- 2) 회원 프로필 — 카카오/구글 SSO(F-01) 로그인 시 auth.users에 없는 앱 전용 필드 보관
-- 실제 필드명(raw_user_meta_data 키)은 OAuth 연동 방식 확정 후 조정 필요
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  profile_image_url text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, nickname, profile_image_url)
  values (new.id, new.raw_user_meta_data ->> 'nickname', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) 추구미 테스트 세션 — 답변은 정규화 테이블 대신 journey JSONB 하나에 저장 (mood-test-questions.md 로깅 스키마)
-- PRD §5.7: 서버에는 완성본만 커밋 — 테스트 완료 시점에 status='completed'로 1회 생성
create table mood_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  guest_session_id uuid references guest_sessions (id),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  journey jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mood_test_sessions_owner_check check (
    (user_id is not null and guest_session_id is null)
    or (user_id is null and guest_session_id is not null)
  )
);

create index mood_test_sessions_user_id_idx on mood_test_sessions (user_id);
create index mood_test_sessions_guest_session_id_idx on mood_test_sessions (guest_session_id);
alter table mood_test_sessions enable row level security;

-- 4) 무드보드 생성 잡 — #36(Claude 분석) 출력 보관 + #37(생성 파이프라인) 진행률 폴링
-- result_moodboard_id는 #23이 만드는 moodboards(id)를 참조해야 하지만, 이 마이그레이션 시점에
-- moodboards 테이블이 아직 없을 수 있어 inline FK 대신 아래 별도 ALTER 문(주석 처리)으로 분리했다.
-- #23 완료 후 주석을 해제해서 실행할 것.
create table moodboard_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  test_session_id uuid not null references mood_test_sessions (id),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  status_message text,
  base_image_url text,              -- 조립된 보드 이미지 (PRD §5.7 — Moodboard row 생성 전 편집 화면이 참조하는 서버 에셋)
  mood_profile jsonb,               -- #36 출력: title/type_name/reading/mood_vector/keywords/sticker_phrases/image_prompt
  result_moodboard_id uuid,         -- "완성하고 공유하기" 저장 시점에만 채워짐 (moodboards FK는 #23 이후 별도 추가)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moodboard_generation_jobs_test_session_id_idx on moodboard_generation_jobs (test_session_id);
alter table moodboard_generation_jobs enable row level security;

-- #23(moodboards 테이블) 머지 후 아래 실행:
-- alter table moodboard_generation_jobs
--   add constraint moodboard_generation_jobs_result_moodboard_id_fkey
--   foreign key (result_moodboard_id) references moodboards (id);
