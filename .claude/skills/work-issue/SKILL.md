---
name: work-issue
description: todo-list.md 의 todo item 번호(a1 등)나 작업명을 입력하면, 프로젝트를 탐색해 docs/work/todo/ 에 이슈 문서 초안을 작성하고 GitHub 이슈(시안 A - 이모지 브래킷형)로 등록합니다. 실행한 본인에게 배정, 페이지 라벨 부착, "무드미 MVP" 보드 백로그 추가 + 일정 기록까지 자동입니다. todo item을 이슈화할 때 사용합니다.
---

# /work-issue — todo item → 이슈 문서 초안 → GitHub 이슈 자동 등록

`docs/work/plan/todo-list.md` 의 todo item 하나를 받아, **프로젝트 탐색 후 이슈 문서 초안을 작성**하고 GitHub 이슈로 등록한다. 이슈는 **시안 A(이모지 브래킷형)** 컨벤션을 따르며, **실행한 본인**에게 자동 배정하고 **`무드미 MVP` 프로젝트 보드의 `백로그`** 에 올린다.

사용 예: `/work-issue a1` 또는 `/work-issue 로그인 페이지 구현`

## 0. 사전 점검 (실패 시 즉시 중단하고 안내)

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status >/dev/null 2>&1 || echo "NO_AUTH"
```

- `NO_GH` → "gh CLI가 필요합니다. `brew install gh` 후 다시 시도하세요." 안내 후 중단.
- `NO_AUTH` → "GitHub 로그인이 필요합니다. 프롬프트에 `! gh auth login` 을 입력해 로그인한 뒤 다시 실행하세요." 안내 후 중단.

## 1. todo item 찾기

`docs/work/plan/todo-list.md` 를 읽고 입력된 인자(번호 `a1` 또는 작업명)로 해당 행을 찾는다.

- **인자가 없거나 못 찾으면** → 이슈 열이 빈(미등록) 항목들을 역할별로 정리해 보여주고 `AskUserQuestion` 으로 선택받는다.
- **이슈 열에 이미 `#N` 이 있으면** → "이미 이슈 #N 으로 등록된 항목입니다." 안내 후 중단 (재등록 방지).
- 찾은 행에서 **번호 · 작업이름 · 일정 · 페이지** 와, 행이 속한 섹션의 **역할**을 확보한다.

## 2. 이슈 문서 초안 작성 (프로젝트 탐색 기반)

1. 프로젝트를 탐색해 초안 근거를 모은다: `docs/prd/` 의 PRD, 관련 코드(`src/`), 기존 `docs/work/todo/` 문서들.
   - ⚠️ 이 저장소의 Next.js는 학습 데이터와 다르다. 구현 방향을 적을 때 `AGENTS.md` 지침대로 `node_modules/next/dist/docs/` 의 관련 가이드를 참고한다.
2. `docs/work/ISSUE_TEMPLATE.md` 구조를 따라 **`docs/work/todo/<번호>-<작업명 영문 kebab-case>.md`** 를 생성한다.
   - 예: `a1` + "로그인 페이지 구현" → `docs/work/todo/a1-login-page.md`
   - front-matter: `todo`(번호) / `role`(역할) / `type`(작업 성격에 맞는 커밋 prefix, 기본 `feat`) / `title`(작업이름 기반 이슈 제목) / `page` / `schedule`(일정) / `issue:`(빈 값) / `output`(아래 기준)
   - **`output: repo | none`** — 작업 결과물이 레포에 들어가는가로 판단한다.
     - `repo`: 코드·문서·설정·이미지 등 커밋될 산출물이 있음 → `/work-work` 가 **draft PR** 흐름으로 진행
     - `none`: 신청·회의·이름 선정 등 레포 밖에서 끝나는 작업 → PR 없이 **이슈 + 보드로만** 추적, 완료는 `/work-done`
     - 애매하면 초안 확인 단계에서 사용자에게 함께 확정받는다.
   - 본문: 역할 관점을 반영해 `## 📋 개요`(PRD 근거 포함) / `## ✅ 작업 내용`(구현 단위 체크리스트) / `## 🎯 완료 조건` / `## 🔗 참고` 를 탐색 결과 기반으로 작성.
3. **작성한 초안을 사용자에게 보여주고 확인받는다.** 수정 요청이 있으면 반영한 뒤 다음 단계로 진행한다.

## 3. 이슈 본문 생성 (시안 A)

- `type` 은 커밋 prefix 목록과 동일해야 함: `feat|fix|refactor|rename|remove|style|chore|docs|hotfix|test|perf`. 목록에 없으면 사용자에게 확인.
- **이슈 제목** = `[` + `type` 의 **첫 글자만 대문자**(나머지 소문자) + `] ` + front-matter `title`
  - 예: `type: feat`, `title: 로그인 페이지 구현` → `[Feat] 로그인 페이지 구현`
- **이슈 본문** = 문서의 `## 📋 개요` / `## ✅ 작업 내용` / `## 🎯 완료 조건` / `## 🔗 참고` 섹션을 그대로 사용하되, `## 🔗 참고` 첫 항목에 원본 문서 경로 `- \`docs/work/todo/<파일명>.md\`` 를 넣는다(중복이면 생략).

## 4. 라벨 준비 (페이지 단위)

라벨은 **타입이 아니라 페이지** 로 붙인다. 허용 라벨은 아래 7개로 고정:

`로그인` · `메인` · `테스트` · `보드생성` · `보드편집` · `보드완성` · `공통`

- todo item의 페이지 값이 위 7개 중 하나인지 확인한다. 아니거나 비어있으면 `AskUserQuestion` 으로 확정한다.
- 라벨이 레포에 없으면 아래로 보강(있으면 무시):

```bash
gh label create "로그인"   --color 1D76DB --description "로그인 / 카카오 SSO 관련"       --force 2>/dev/null || true
gh label create "메인"     --color 0E8A16 --description "메인 페이지 관련"                --force 2>/dev/null || true
gh label create "테스트"   --color 5319E7 --description "추구미 테스트 플로우 관련"       --force 2>/dev/null || true
gh label create "보드생성" --color D93F0B --description "무드보드 생성(AI 생성중) 관련"   --force 2>/dev/null || true
gh label create "보드편집" --color FBCA04 --description "무드보드 편집 관련"              --force 2>/dev/null || true
gh label create "보드완성" --color 006B75 --description "최종 결과물 페이지 관련"         --force 2>/dev/null || true
gh label create "공통"     --color BFDADC --description "여러 페이지에 걸친 공통 작업"    --force 2>/dev/null || true
```

> 페이지 라벨 목록을 바꿀 때는 이 스킬, `/work-work` 스킬, `docs/work/ISSUE_TEMPLATE.md`, `docs/work/README.md`, `docs/work/plan/todo-list.md` 를 함께 맞춘다.

## 5. 이슈 생성 + 배정 + 보드 등록 + 일정 기록

**핵심(반드시 성공해야 함): 이슈 생성 + 본인 배정.**

```bash
gh issue create \
  --title "[Feat] 로그인 페이지 구현" \
  --body-file <임시 본문 파일 경로> \
  --label "로그인" \
  --assignee "@me"
```

- 본문은 스크래치패드에 임시 `.md`로 저장해 `--body-file`로 넘긴다(이모지/줄바꿈 안전).
- `--assignee "@me"` 로 **이 스킬을 실행한 사람** 에게 배정된다.
- 출력에서 이슈 URL과 번호(`#N`)를 파싱해 기억한다.

**프로젝트 보드 등록 + 일정 기록 (best-effort — 실패해도 이슈 자체는 유효):**

보드에는 "일정" 이라는 Roadmap 뷰가 있고, 날짜 필드 기준으로 아이템이 타임라인에 표시된다. todo 일정을 날짜 필드에 기록해야 일정 뷰에 나타난다.

```bash
OWNER="moodme-teo"
# 1) 프로젝트 번호 찾기
PNUM=$(gh project list --owner "$OWNER" --format json \
  | python3 -c "import sys,json;print(next((p['number'] for p in json.load(sys.stdin)['projects'] if p['title']=='무드미 MVP'),''))")
# 2) 이슈를 프로젝트에 추가 → item id 획득
ITEM=$(gh project item-add "$PNUM" --owner "$OWNER" --url <이슈URL> --format json | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
# 3) 필드 목록 조회 → Status 필드의 '백로그' 옵션 id, 날짜 필드 id 확보
gh project field-list "$PNUM" --owner "$OWNER" --format json > <스크래치패드>/fields.json
# 4) Status = 백로그
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <백로그_OPTION_ID>
# 5) 일정 기록 — DATE 타입 필드에 todo 일정 기록 (YY.MM.DD → YYYY-MM-DD 변환)
#    시작 필드(이름에 Start/시작 포함)에 시작일, 종료 필드(End/Target/종료/마감 포함)에 종료일.
#    DATE 필드가 1개뿐이면 그 필드에 종료일만 기록.
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <START_DATE_FIELD_ID> --date 2026-07-06
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <END_DATE_FIELD_ID> --date 2026-07-12
```

- `missing required scopes` 오류가 나면 → "프롬프트에 `! gh auth refresh -s project` 를 입력해 권한을 추가한 뒤 다시 실행하세요." 안내.
- 보드/일정 절차가 어떤 이유로든 실패하면(권한/필드 없음 등) **경고만 남기고 계속 진행**한다. 이슈는 이미 생성/배정되었으므로 성공으로 간주.
- DATE 필드가 하나도 없으면 → "보드에 날짜 필드가 없어 일정 기록을 건너뜀 — 보드 설정에서 Start/End date 필드를 추가하면 일정 뷰에 표시됩니다." 한 줄 안내.

## 6. 이슈 번호 역기록 (반드시 2곳 모두)

1. **이슈 문서** front-matter의 `issue:` 를 생성된 번호로 채운다: `issue: 42`
2. **`docs/work/plan/todo-list.md`** 해당 todo item 행의 이슈 열에 `#42` 를 기록한다.

이렇게 해야 todo item ↔ 이슈 문서 ↔ GitHub 이슈가 연결되고, 다음 실행에서 재등록되지 않는다. 다른 내용은 건드리지 않는다.

## 7. 결과 보고

다음을 간결하게 보고:
- 📝 초안 문서: `docs/work/todo/a1-login-page.md`
- ✅ 등록된 이슈: `#N [Feat] ...` + URL
- 👤 배정: @본인
- 🏷 라벨: <페이지> (예: 로그인)
- 📋 프로젝트: 무드미 MVP → 백로그 + 일정 기록 (또는 수동 배치 안내)
- 🔁 역기록: 문서 `issue: N` + todo-list 이슈 열 `#N`
- 다음 단계: `/work-work` 로 작업 시작 (`output: repo` 면 draft PR 흐름, `none` 이면 보드 추적만 — 완료 시 `/work-done`)

> 커밋 여부는 사용자에게 맡긴다. 필요하면 `docs : a1 이슈 문서 작성 및 이슈 번호 기록` 형식으로 커밋할 수 있음을 안내(자동 커밋하지 않음).
