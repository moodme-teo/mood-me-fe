---
name: work-issue
description: docs/work/todo 안의 작업 문서를 읽어 GitHub 이슈(시안 A - 이모지 브래킷형)로 자동 등록하고, 문서 작성자에게 배정한 뒤 "무드미 MVP" 프로젝트 보드(백로그)에 추가합니다. 라벨은 페이지 단위로 붙습니다. 개발자가 작업 명세를 docs/work/todo에 적은 뒤 이슈를 만들 때 사용합니다.
---

# /work-issue — 작업 문서 → GitHub 이슈 자동 등록

`docs/work/todo/`에 작성된 작업 문서를 GitHub 이슈로 등록한다. 이슈는 **시안 A(이모지 브래킷형)** 컨벤션을 따르며, **문서를 작성한(= 이 스킬을 실행한) 사람**에게 자동 배정하고 **`무드미 MVP` 프로젝트 보드의 `백로그`** 에 올린다. (파일명은 자유)

## 0. 사전 점검 (실패 시 즉시 중단하고 안내)

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status >/dev/null 2>&1 || echo "NO_AUTH"
```

- `NO_GH` → "gh CLI가 필요합니다. `brew install gh` 후 다시 시도하세요." 안내 후 중단.
- `NO_AUTH` → "GitHub 로그인이 필요합니다. 프롬프트에 `! gh auth login` 을 입력해 로그인한 뒤 다시 실행하세요." 안내 후 중단.

## 1. 등록할 작업 문서 찾기

`docs/work/todo/` 의 `.md` 파일(파일명 자유) 중, front-matter의 `issue:` 값이 **비어있는**(아직 미등록) 문서만 후보로 모은다.

```bash
ls docs/work/todo/*.md 2>/dev/null
```

각 후보의 front-matter에서 `issue:` 를 확인:
- `issue:` 에 이미 숫자가 있으면 → 등록 완료된 문서. 후보에서 제외.
- 후보가 **0개** → "등록할 새 작업 문서가 없습니다. `docs/work/_template.md`를 복사해 `docs/work/todo/`에 작성한 뒤 다시 실행하세요." 안내 후 중단.
- 후보가 **1개** → 그 문서로 진행.
- 후보가 **2개 이상** → 파일명과 `title`을 목록으로 보여주고 `AskUserQuestion`으로 어떤 문서를 등록할지 선택받는다. (여러 개 한 번에 등록하려면 각각에 대해 2~4단계를 반복)

## 2. 문서 파싱 & 이슈 본문 생성 (시안 A)

선택된 문서의 front-matter와 본문을 읽어 다음을 만든다.

- `type` = front-matter `type` (기본값 `feat`). 커밋 prefix 목록과 동일해야 함: `feat|fix|refactor|rename|remove|style|chore|docs|hotfix|test|perf`. 목록에 없으면 사용자에게 확인.
- **이슈 제목** = `[` + `type`의 **첫 글자만 대문자**(나머지 소문자) + `] ` + front-matter `title`
  - 예: `type: feat`, `title: 무드보드 공유 버튼 추가` → `[Feat] 무드보드 공유 버튼 추가`
  - 예: `type: fix` → `[Fix] ...`, `type: hotfix` → `[Hotfix] ...`
- **이슈 본문** = 문서의 `## 📋 개요` / `## ✅ 작업 내용` / `## 🎯 완료 조건` / `## 🔗 참고` 섹션을 그대로 사용하되, 참고 섹션 맨 위에 원본 문서 경로 한 줄을 추가한다:
  - `## 🔗 참고` 첫 항목에 `- \`docs/work/todo/<파일명>.md\`` 를 넣는다(중복이면 생략).
- **라벨** = front-matter `page` 값. **페이지 단위**로 관리한다. 아래 3단계 참고.

## 3. 라벨 준비 (페이지 단위)

라벨은 **타입이 아니라 페이지** 로 붙인다. 허용 라벨은 아래 6개로 고정:

`로그인` · `메인` · `테스트` · `보드생성` · `보드편집` · `보드완성`

- front-matter `page` 값이 위 6개 중 하나인지 확인한다. 아니거나 비어있으면 사용자에게 어떤 페이지인지 `AskUserQuestion`으로 물어 확정한다.
- 이 6개 라벨은 레포에 이미 생성되어 있다. 혹시 없으면 아래로 보강(있으면 무시):

```bash
gh label create "로그인"   --color 1D76DB --description "로그인 / 카카오 SSO 관련"       --force 2>/dev/null || true
gh label create "메인"     --color 0E8A16 --description "메인 페이지 관련"                --force 2>/dev/null || true
gh label create "테스트"   --color 5319E7 --description "추구미 테스트 플로우 관련"       --force 2>/dev/null || true
gh label create "보드생성" --color D93F0B --description "무드보드 생성(AI 생성중) 관련"   --force 2>/dev/null || true
gh label create "보드편집" --color FBCA04 --description "무드보드 편집 관련"              --force 2>/dev/null || true
gh label create "보드완성" --color 006B75 --description "최종 결과물 페이지 관련"         --force 2>/dev/null || true
```

> 페이지 라벨 목록을 바꿀 때는 이 스킬, `/work-work` 스킬, `docs/work/_template.md`, `docs/work/README.md` 를 함께 맞춘다.

## 4. 이슈 생성 + 배정 + 프로젝트 보드 등록

**핵심(반드시 성공해야 함): 이슈 생성 + 본인 배정.**

```bash
gh issue create \
  --title "[Feat] 무드보드 공유 버튼 추가" \
  --body-file <임시 본문 파일 경로> \
  --label "보드완성" \
  --assignee "@me"
```

- 본문은 스크래치패드에 임시 `.md`로 저장해 `--body-file`로 넘긴다(이모지/줄바꿈 안전).
- `--assignee "@me"` 로 **이 스킬을 실행한 사람(=문서 작성자)** 에게 배정된다.
- 출력에서 이슈 URL과 번호(`#N`)를 파싱해 기억한다.

**프로젝트 보드 등록 (best-effort — 실패해도 이슈 자체는 유효):**

```bash
OWNER="moodme-teo"
# 1) 프로젝트 번호 찾기
PNUM=$(gh project list --owner "$OWNER" --format json \
  | python3 -c "import sys,json;print(next((p['number'] for p in json.load(sys.stdin)['projects'] if p['title']=='무드미 MVP'),''))")
# 2) 이슈를 프로젝트에 추가 → item id 획득
ITEM=$(gh project item-add "$PNUM" --owner "$OWNER" --url <이슈URL> --format json | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
# 3) Status 필드 & '백로그' 옵션 id 찾아서 설정
gh project field-list "$PNUM" --owner "$OWNER" --format json > /tmp/fields.json
# python으로 Status 필드 id와 '백로그' 옵션 id를 뽑아 아래 실행
gh project item-edit --project-id <PROJECT_NODE_ID> --id "$ITEM" \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <백로그_OPTION_ID>
```

- 위 절차가 어떤 이유로든 실패하면(권한/이름 불일치 등) **경고만 남기고 계속 진행**한다. 이슈는 이미 생성/배정되었으므로 성공으로 간주.
- 실패 시 사용자에게 "보드 자동 배치 실패 — 보드에서 수동으로 백로그에 올려주세요" 라고 한 줄 안내.

## 5. 문서에 이슈 번호 역기록

원본 문서 front-matter의 `issue:` 줄을 생성된 번호로 채운다. 이렇게 해야 다음 실행에서 재등록되지 않는다.

```
issue: 42
```

(front-matter의 `issue:` 값만 교체. 다른 내용은 건드리지 않는다.)

## 6. 결과 보고

다음을 간결하게 보고:
- ✅ 등록된 이슈: `#N [Feat] ...` + URL
- 👤 배정: @본인
- 🏷 라벨: <페이지> (예: 테스트)
- 📋 프로젝트: 무드미 MVP → 백로그 (또는 수동 배치 안내)
- 📝 문서에 `issue: N` 기록 완료

> 커밋 여부는 사용자에게 맡긴다. 문서의 `issue:` 변경사항은 필요하면 `docs : <파일> 이슈 번호 기록` 형식으로 커밋할 수 있음을 안내(자동 커밋하지 않음).
