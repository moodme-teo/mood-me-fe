-- 재편집 구도 복원 — exported_image_data_url(평면 이미지)만으로는 도형·배경·확대·위치를
-- 되살릴 수 없어 재편집 진입 시 항상 기본값으로 초기화됐다. 편집 상태를 별도로 저장한다.
-- 참고: docs/prd/mood-me-prd.md §7 EditState · docs/prd/mood-edit.md §12
-- Refs #116

alter table moodboards
  add column if not exists edit_state jsonb;
