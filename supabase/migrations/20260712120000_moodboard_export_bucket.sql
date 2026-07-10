-- 크롭 에디터 export 결과(PNG)를 base64 dataURL 그대로 PATCH 요청 body와 DB에 싣던
-- 방식을 Supabase Storage 업로드 + URL 기록으로 바꾼다 (#163). dataURL을 그대로 보내면
-- Vercel의 요청 바디 제한에 걸려 배포 환경에서만 "content too large"(413)가 났다.
-- docs/convention/canvas.md가 이미 규정해 둔 흐름("dataURL → Storage 업로드 → URL 기록")
-- 을 처음으로 구현한다.

insert into storage.buckets (id, name, public)
values ('moodboard-exports', 'moodboard-exports', true)
on conflict (id) do nothing;

-- 공유 링크(공개 결과 페이지)가 <img>로 그대로 노출하는 이미지라 read는 공개 버킷으로 둔다.
-- write는 서비스 롤이 발급하는 signed upload URL로만 이뤄진다 — 다른 코어 테이블과 같은
-- 원칙으로 anon/authenticated insert 정책은 따로 두지 않는다 (#42, #126).

alter table moodboards
  rename column exported_image_data_url to exported_image_url;

comment on column moodboards.exported_image_url is
  '크롭 에디터 export 결과 PNG의 Supabase Storage 공개 URL — base64 dataURL이 아니다 (#163)';
