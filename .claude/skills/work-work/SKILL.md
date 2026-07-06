---
name: work-work
description: 나에게 배정된 열린 GitHub 이슈 목록을 불러와 그중 작업할 것을 선택하면 작업을 시작합니다. 보드 상태를 '진행중'으로 옮기고, 레포 결과물이 있는 작업(output repo)은 dev 기준 브랜치를 따 draft PR을 즉시 열어 구현·커밋을 이어가고, 완료 조건 충족 시 ready for review 로 전환해 리뷰어를 지정합니다. 레포 결과물이 없는 작업(output none)은 PR 없이 보드로만 추적합니다. 배정받은 작업을 시작할 때 사용합니다.
---

# /work-work — 배정된 이슈 선택 → 진행중 → (repo면) draft PR → 구현 → ready

나에게 배정된 이슈 중 하나를 골라 작업을 시작한다. **PR은 레포에 들어갈 결과물이 있는 작업(`output: repo`)에만 연다.** 진행중 표시를 위해 **작업 시작 시점에 draft PR을 미리 열고**, 구현하며 커밋을 쌓다가 완료 조건을 충족하면 ready for review 로 전환한다. 머지는 사람이 한다.

## 0. 사전 점검

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status  >/dev/null 2>&1 || echo "NO_AUTH"
git status --porcelain            # 워킹트리 확인
```

- `NO_GH` / `NO_AUTH` → `/work-issue`와 동일하게 안내 후 중단.
- 워킹트리에 커밋 안 된 변경이 있으면 → 사용자에게 "커밋되지 않은 변경이 있습니다. 계속하면 새 브랜치에 함께 올라갈 수 있어요. 진행할까요?"라고 확인.

## 1. 나에게 배정된 열린 이슈 불러오기 & 선택

```bash
gh issue list --assignee "@me" --state open \
  --json number,title,labels,url --limit 50
```

- 결과가 **0개** → "@me 에게 배정된 열린 이슈가 없습니다. `/work-issue`로 먼저 등록하거나 보드에서 배정받으세요." 후 중단.
- 결과를 번호·제목·라벨로 정리해 `AskUserQuestion`으로 **어떤 이슈를 작업할지 하나 선택**받는다. (한 번에 하나만 진행)

## 2. 명세 확보 + `output` 판별

선택한 이슈에서 작업 명세를 찾는다.

1. `docs/work/todo/*.md` 중 front-matter `issue:` 값이 **선택한 이슈 번호와 일치**하는 문서를 찾아 읽는다(가장 신뢰할 수 있는 출처).
2. 못 찾으면 이슈 본문의 `## 🔗 참고`에 적힌 `docs/work/todo/...` 경로를 사용한다.
3. 그래도 없으면 이슈 본문 자체(개요/작업 내용/완료 조건)를 명세로 사용한다.

명세의 **✅ 작업 내용** 체크리스트와 **🎯 완료 조건**을 구현 기준으로 삼는다.

**`output` 판별 (repo | none):**
- 문서 front-matter `output` 값을 우선 사용.
- 없으면 "결과물이 레포에 들어가는 작업인가"를 `AskUserQuestion`으로 확정하고, 문서가 있으면 front-matter에 역기록한다.

**페이지 라벨** 확보(`output: repo` 인 경우 PR에 그대로 붙임):
- docs 문서 front-matter `page` 값을 우선 사용.
- 없으면 이슈에 붙은 라벨 중 페이지 라벨(`로그인|메인|테스트|보드생성|보드편집|보드완성|공통`)을 사용.
- 그래도 없으면 `AskUserQuestion`으로 어떤 페이지인지 물어 확정.

## 3. 보드 상태 → `진행중` (공통)

작업 시작 표시로 `무드미 MVP` 보드에서 이슈 상태를 `진행중`으로 옮긴다.

```bash
OWNER="moodme-teo"
PNUM=$(gh project list --owner "$OWNER" --format json \
  | python3 -c "import sys,json;print(next((p['number'] for p in json.load(sys.stdin)['projects'] if p['title']=='무드미 MVP'),''))")
# item id: item-list 에서 이슈 번호로 찾기
gh project item-list "$PNUM" --owner "$OWNER" --format json --limit 100
# Status 필드 id / '진행중' 옵션 id: field-list 에서 확보
gh project field-list "$PNUM" --owner "$OWNER" --format json
gh project item-edit --project-id <PROJECT_NODE_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <진행중_OPTION_ID>
```

- 보드 작업은 **best-effort** — 실패(권한/필드 없음)해도 경고만 남기고 계속 진행한다. `missing required scopes` 면 `! gh auth refresh -s project` 안내.

**여기서 `output` 에 따라 분기한다:**
- **`none`** → 브랜치/PR 없이 여기서 종료. "레포 결과물이 없는 작업이라 PR 없이 보드로만 추적합니다. 작업이 끝나면 `/work-done` 으로 완료 처리하세요." 안내하고 결과 보고(7)로 간다.
- **`repo`** → 4단계로 계속.

## 4. 작업 브랜치 생성 + draft PR 즉시 오픈 (`output: repo`)

브랜치 전략을 따른다:
- `main` : release 된 것 (배포 기준)
- `dev` : 개발 통합 브랜치. 모든 feature PR은 여기로 **squash-merge**.
- `feature` : **`dev`에서 따서** 작업 → PR 생성 → `dev`로 merge.

규칙:
- **기준 브랜치는 항상 `dev`** (원격 최신 반영).
- 브랜치명 컨벤션: `<prefix>/<작업명>` — prefix는 이슈 `type`, 작업명은 영문 kebab-case.
  - 예: `feat/login`, `fix/board-export`, `refactor/test-flow`

```bash
git fetch origin
git switch -c "feat/login" origin/dev
```

**진행중 표시를 위해 PR을 draft 로 먼저 연다.** 초기 커밋은:
- 이미 커밋할 산출물(문서 초안 등)이 있으면 그것으로,
- 없으면 빈 커밋으로 시작한다: `git commit --allow-empty -m "<prefix> : <제목> 작업 시작"`

```bash
git push -u origin <브랜치명>
gh pr create --draft \
  --base dev \
  --head <브랜치명> \
  --title "<prefix> : <제목>" \
  --body-file <임시 PR 본문 파일> \
  --label "<페이지 라벨>" \
  --assignee "@me"
```

- **PR 제목**: 커밋 컨벤션과 동일하게 `<prefix> : <메시지>` (예: `feat : 무드보드 공유 버튼 추가`).
- **라벨**: 이슈와 동일한 **페이지 라벨**(2단계에서 확보).
- **리뷰어는 draft 단계에서 지정하지 않는다** — ready for review 전환 시(6단계) 지정.
- **PR 본문 템플릿** (draft 시점에는 체크리스트가 비어 있어도 됨):

```markdown
## 작업 내용
- 명세 체크리스트 기반 작업 항목

## 관련 이슈
Closes #42

## 완료 조건 확인
- [ ] (명세의 완료 조건 항목들)

## 리뷰 포인트
- ready 전환 시 작성
```

- `Closes #42` 로 머지 시 이슈가 자동으로 닫히게 한다.
- ⚠️ **PR은 보드(`무드미 MVP`)에 추가하지 않는다.** 보드에는 이슈만 올린다. PR은 `Closes #N` 로 연결되어 이슈 카드에 배지로 표시된다. PR을 별도 카드로 올리면 같은 작업이 중복으로 보인다.

## 5. 구현 & 커밋 (컨벤션 필수)

⚠️ **이 저장소의 Next.js는 학습 데이터와 다릅니다.** 코드를 쓰기 전 `AGENTS.md` 지침대로 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 읽고, deprecation 경고를 따른다.

- 명세의 **작업 내용** 체크리스트를 순서대로 구현한다.
- UI 작업이면 팀 디자인 스킬 `impeccable` 기준(`PRODUCT.md`/`DESIGN.md`)을 따른다. UI 파일 편집 시 자동 detector가 도는 점을 고려한다.
- 커밋 컨벤션 등 프로젝트 규칙(`docs/convention/`)을 준수한다.
- 구현 중 판단이 어려운 스펙 공백은 임의로 넘겨짚지 말고 사용자에게 확인한다.

커밋 메시지는 **반드시** `<prefix> : <메시지>` 형식 (Husky `commit-msg` 훅이 강제, 안 맞으면 커밋 거부됨).

- prefix는 이슈 `type`을 사용. 예: `feat : 무드보드 공유 버튼 추가`
- 논리 단위로 나눠 커밋하고 **수시로 push** 해 draft PR에 진행 상황이 보이게 한다.
- 본문 마지막 줄에 이슈 연결을 남기는 것을 권장: `Refs #42` (닫기는 PR의 `Closes` 가 처리).

```bash
git add -A
git commit -m "feat : 무드보드 공유 버튼 추가"
git push
```

## 6. 완료 조건 충족 → ready for review + 리뷰어 지정

명세의 **🎯 완료 조건**을 모두 충족하면:

1. PR 본문의 완료 조건 체크리스트를 채우고 리뷰 포인트를 작성한다 (`gh pr edit --body-file ...`).
2. **본인을 제외한 레포 협업자 전원**을 리뷰어로 지정하고 draft 를 해제한다:

```bash
ME=$(gh api user -q .login)
REVIEWERS=$(gh api repos/moodme-teo/mood-me-fe/collaborators --jq '.[].login' \
  | grep -v "^${ME}$" | paste -sd, -)
gh pr edit <PR번호> --add-reviewer "$REVIEWERS"   # 협업자가 본인뿐이면 생략
gh pr ready <PR번호>
```

이후 **리뷰 → 머지**는 사람이 진행한다. 머지되면 `Closes #N` 으로 이슈가 자동으로 닫히고, 보드 정리는 `/work-done` 으로 마무리한다.

## 7. 결과 보고

- 📋 보드: 이슈 `#N` → `진행중`
- (`output: repo`) 🌿 브랜치: `feat/login` (dev 기준) · 🔀 draft PR: URL (base: dev, `Closes #N`) · 🏷 라벨: <페이지>
- (`output: repo`, ready 전환까지 한 경우) 👀 리뷰어: <본인 제외 협업자>
- (`output: none`) PR 없음 — 완료 시 `/work-done` 으로 이슈 닫기 + 보드 `작업 완료`
- 다음 단계: 리뷰 → 머지(사람) → `/work-done`

> 절대 임의로 `dev`/`main`에 직접 push하거나 머지하지 않는다. 머지는 리뷰 이후 사람이 결정한다.
