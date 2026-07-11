---
name: work-issue
argument-hint: 역할, 작업이름, 일정(26.07.06~26.07.12), 페이지 [--assignee 이름|none]
description: 작업 내용(역할, 작업이름, 일정, 페이지)을 입력하면 프로젝트를 탐색해 명세를 작성하고 곧바로 GitHub 이슈(시안 A - 이모지 브래킷형)로 등록합니다. 명세는 이슈 본문에 담기며 레포 파일을 만들지 않습니다(커밋 불필요). 배정 기본값은 실행한 본인, --assignee 로 다른 사람 지정·미배정도 가능합니다. 페이지 라벨 부착, "무드미 MVP" 보드 백로그 추가 + 일정·역할 기록까지 자동입니다. 작업을 이슈로 등록할 때 사용합니다.
---

# /work-issue — 작업 내용 입력 → 명세 탐색 → GitHub 이슈 즉시 등록

작업 내용(역할·작업이름·일정·페이지)을 입력받아, **프로젝트 탐색 후 명세를 이슈 본문으로 작성**하고 GitHub 이슈로 바로 등록한다. 이슈는 **시안 A(이모지 브래킷형)** 컨벤션을 따르고, **`무드미 MVP` 프로젝트 보드의 `백로그`** 에 올린다.

사용 예:

```
/work-issue 빌더, 로그인 페이지 구현, 26.07.06~26.07.12, 로그인
/work-issue 빌더, 로그인 페이지 구현, 26.07.06~26.07.12, 로그인 --assignee hyeon-aa
/work-issue 그로워, OG 이미지 개선, 26.07.09~26.07.09, 보드완성 --assignee none
```

> **레포 파일을 만들지 않는다.** 명세는 이슈 본문에 담는다 — git 브랜치/커밋/PR이 전혀 필요 없다.
> **대량 등록에는 부적합.** 건당 프로젝트 탐색을 수행하므로, 계획 회의에서 여러 개를 한꺼번에 부을 때는 이 스킬 대신 GitHub에서 직접 등록한다.

## 0. 사전 점검 (실패 시 즉시 중단하고 안내)

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status >/dev/null 2>&1 || echo "NO_AUTH"
```

- `NO_GH` → "gh CLI가 필요합니다. `brew install gh` 후 다시 시도하세요." 안내 후 중단.
- `NO_AUTH` → "GitHub 로그인이 필요합니다. 프롬프트에 `! gh auth login` 을 입력해 로그인한 뒤 다시 실행하세요." 안내 후 중단.

## 1. 입력 파싱

입력에서 다음 값을 파싱한다 (구분자는 쉼표/줄바꿈 등 유연하게 해석):

- **역할**: `프로토타이퍼 | 빌더 | 스위퍼 | 그로워 | 메인테이너 | UXUI Leader | PM | 다같이`
- **작업이름**: 자유 텍스트
- **일정**: `26.07.06~26.07.12` 형식 (`YY.MM.DD~YY.MM.DD`). 하루짜리면 `26.07.06~26.07.06`.
- **페이지/범위**: `로그인 | 메인 | 보드생성 | 보드완성 | 보드편집 | 테스트 | 전역 | 운영 | 품질 | 디자인`
- **`--assignee <값>`** (선택): 담당자 지정.
  - 생략 → **실행한 본인**(`@me`)에게 배정 (기본값)
  - GitHub 로그인명 → 그 사람에게 배정
  - `none`(또는 `없음`/`미지정`) → 미배정. `/work-work` 에서 집어가는 사람이 배정된다.

빠졌거나 허용값이 아닌 항목은 `AskUserQuestion` 으로 확인해 확정한다(역할·페이지는 선택지 제시, 일정은 형식 검증).

## 2. 중복 확인

같은 작업이 이미 이슈로 있는지 확인한다:

```bash
gh issue list --state open --search "<작업이름 핵심 키워드> in:title" --json number,title
```

유사 제목의 열린 이슈가 있으면 사용자에게 보여주고 계속 진행할지 확인한다 (재등록 방지).

## 3. 명세 작성 (프로젝트 탐색 기반)

1. 프로젝트를 탐색해 명세 근거를 모은다: `docs/prd/` 의 PRD, 관련 코드(`src/`), 관련 열린/닫힌 이슈.
   - ⚠️ 이 저장소의 Next.js는 학습 데이터와 다르다. 구현 방향을 적을 때 `AGENTS.md` 지침대로 `node_modules/next/dist/docs/` 의 관련 가이드를 참고한다.
2. `docs/work/ISSUE_TEMPLATE.md` 구조를 따라 **이슈 본문**을 작성한다 (스크래치패드에 임시 `.md` 파일로):
   - `## 📋 개요` (왜 필요한지, PRD 근거 포함) / `## ✅ 작업 내용` (구현 단위 체크리스트 — `/work-work` 가 이 순서대로 구현) / `## 🎯 완료 조건` (PR 리뷰/머지 기준) / `## 🔗 참고` (관련 문서/PRD 섹션/이슈 링크)
   - `## 🔗 참고` 마지막 줄에 메타데이터 한 줄을 남긴다: `> 역할: 빌더 · 일정: 26.07.06~26.07.12`
3. **type**(커밋 prefix)을 작업 성격에 맞게 정한다: `feat|fix|refactor|rename|remove|style|chore|docs|hotfix|test|perf` (기본 `feat`).
4. **작성한 명세를 사용자에게 보여주고 확인받는다.** 수정 요청이 있으면 반영한 뒤 다음 단계로 진행한다.

## 4. 이슈 제목 (시안 A)

- **이슈 제목** = `[` + `type` 의 **첫 글자만 대문자**(나머지 소문자) + `] ` + 작업이름 기반 제목
  - 예: `type: feat`, 작업이름 "로그인 페이지 구현" → `[Feat] 로그인 페이지 구현`

> `/work-work` 는 이 브래킷에서 type을 역산해(`[Feat]` → `feat`) 브랜치명·커밋 prefix에 사용한다. 브래킷 형식을 지킬 것.

## 5. 라벨 준비 (페이지/범위 단위)

라벨은 **타입이 아니라 페이지/범위** 로 붙인다. 허용 라벨은 아래 10개로 고정 — 페이지 6개 + 범위 4개:

- 페이지: `로그인` · `메인` · `테스트` · `보드생성` · `보드편집` · `보드완성`
- 범위: `전역`(여러 페이지에 걸친 기능 코드) · `운영`(프로세스·세팅·릴리즈·데모·라이선스) · `품질`(버그·접근성·반응형·리팩토링) · `디자인`(디자인 시스템·토큰·시안)

- 페이지 값이 위 10개 중 하나인지 확인한다. 아니거나 비어있으면 `AskUserQuestion` 으로 확정한다.
- 라벨이 레포에 없으면 아래로 보강(있으면 무시):

```bash
gh label create "로그인"   --color 1D76DB --description "로그인 / 카카오 SSO 관련"       --force 2>/dev/null || true
gh label create "메인"     --color 0E8A16 --description "메인 페이지 관련"                --force 2>/dev/null || true
gh label create "테스트"   --color 5319E7 --description "추구미 테스트 플로우 관련"       --force 2>/dev/null || true
gh label create "보드생성" --color D93F0B --description "무드보드 생성(AI 생성중) 관련"   --force 2>/dev/null || true
gh label create "보드편집" --color FBCA04 --description "무드보드 편집 관련"              --force 2>/dev/null || true
gh label create "보드완성" --color 006B75 --description "최종 결과물 페이지 관련"         --force 2>/dev/null || true
gh label create "전역"     --color BFDADC --description "여러 페이지에 걸친 기능 코드 작업" --force 2>/dev/null || true
gh label create "운영"     --color 6E7781 --description "프로세스·세팅·릴리즈·데모·라이선스 등 프로젝트 운영 작업" --force 2>/dev/null || true
gh label create "품질"     --color B60205 --description "버그·접근성·반응형·리팩토링 등 횡단 품질 작업" --force 2>/dev/null || true
gh label create "디자인"   --color D876E3 --description "디자인 시스템·토큰·시안 작업"      --force 2>/dev/null || true
```

> 라벨 목록을 바꿀 때는 이 스킬, `/work-work` 스킬, `docs/work/ISSUE_TEMPLATE.md`, `docs/work/README.md`, `docs/convention/branch-pr-convention.md` 를 함께 맞춘다.

## 6. 이슈 생성 + 배정 + 보드 등록 + 일정·역할 기록

**핵심(반드시 성공해야 함): 이슈 생성 (+ 배정).**

```bash
gh issue create \
  --title "[Feat] 로그인 페이지 구현" \
  --body-file <임시 본문 파일 경로> \
  --label "로그인" \
  --assignee "@me"        # --assignee 파싱 결과에 따라: "@me" | <로그인명> | 플래그 자체를 생략(미배정)
```

- 본문은 스크래치패드에 임시 `.md`로 저장해 `--body-file`로 넘긴다(이모지/줄바꿈 안전).
- 미배정(`none`)이면 `--assignee` 플래그를 아예 생략한다.
- 출력에서 이슈 URL과 번호(`#N`)를 파싱해 기억한다.

**프로젝트 보드 등록 + 일정·역할 기록 (best-effort — 실패해도 이슈 자체는 유효):**

보드에는 "일정" 이라는 Roadmap 뷰가 있고, 날짜 필드 기준으로 아이템이 타임라인에 표시된다. 일정을 날짜 필드에 기록해야 일정 뷰에 나타난다.

```bash
OWNER="moodme-teo"
# 1) 프로젝트 번호 찾기
PNUM=$(gh project list --owner "$OWNER" --format json \
  | python3 -c "import sys,json;print(next((p['number'] for p in json.load(sys.stdin)['projects'] if p['title']=='무드미 MVP'),''))")
# 2) 이슈를 프로젝트에 추가 → item id 획득
ITEM=$(gh project item-add "$PNUM" --owner "$OWNER" --url <이슈URL> --format json | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
# 3) 필드 목록 조회 → Status 필드의 '백로그' 옵션 id, 날짜 필드 id, 역할 필드 id 확보
gh project field-list "$PNUM" --owner "$OWNER" --format json > <스크래치패드>/fields.json
# 4) Status = 백로그
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <백로그_OPTION_ID>
# 5) 일정 기록 — DATE 타입 필드에 기록 (YY.MM.DD → YYYY-MM-DD 변환)
#    시작 필드(이름에 Start/시작 포함)에 시작일, 종료 필드(End/Target/종료/마감 포함)에 종료일.
#    DATE 필드가 1개뿐이면 그 필드에 종료일만 기록.
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <START_DATE_FIELD_ID> --date 2026-07-06
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <END_DATE_FIELD_ID> --date 2026-07-12
# 6) 역할 기록 — "역할" SINGLE_SELECT 필드가 있으면 입력받은 역할 옵션으로 설정
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <역할_FIELD_ID> --single-select-option-id <역할_OPTION_ID>
```

- `missing required scopes` 오류가 나면 → "프롬프트에 `! gh auth refresh -s project` 를 입력해 권한을 추가한 뒤 다시 실행하세요." 안내.
- 보드/일정/역할 절차가 어떤 이유로든 실패하면(권한/필드 없음 등) **경고만 남기고 계속 진행**한다. 이슈는 이미 생성되었으므로 성공으로 간주.
- DATE 필드가 하나도 없으면 → "보드에 날짜 필드가 없어 일정 기록을 건너뜀 — 보드 설정에서 Start/End date 필드를 추가하면 일정 뷰에 표시됩니다." 한 줄 안내.
- "역할" 필드가 없으면 조용히 건너뛴다(역할은 이슈 본문 메타데이터 줄에도 남아 있음).

## 7. 결과 보고

다음을 간결하게 보고:

- ✅ 등록된 이슈: `#N [Feat] ...` + URL
- 👤 배정: @본인 / @지정된사람 / 미배정
- 🏷 라벨: <페이지> (예: 로그인)
- 📋 프로젝트: 무드미 MVP → 백로그 + 일정·역할 기록 (또는 수동 배치 안내)
- 다음 단계: `/work-work` 로 구현 시작 (미배정 이슈는 집어가는 사람에게 배정됨)

> 레포 파일을 만들지 않으므로 **커밋할 것이 없다.** git 안내를 하지 않는다.
