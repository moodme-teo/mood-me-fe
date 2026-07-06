---
name: work-done
description: 나에게 배정된 이슈 중 끝난 작업을 완료 처리합니다. 레포 결과물이 없는 작업(output none)은 이슈를 닫고, 레포 결과물이 있는 작업(output repo)은 연결 PR이 머지됐는지 확인한 뒤, 무드미 MVP 보드 상태를 '작업 완료'로 옮깁니다. 작업이 끝났을 때 사용합니다.
---

# /work-done — 이슈 완료 처리 (이슈 닫기 + 보드 `작업 완료`)

끝난 작업의 이슈·보드 상태를 정리한다. **PR 머지는 이 스킬이 하지 않는다** — repo 작업은 사람이 머지한 뒤에 실행한다.

## 0. 사전 점검

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status >/dev/null 2>&1 || echo "NO_AUTH"
```

- 실패 시 `/work-issue`와 동일하게 안내 후 중단.

## 1. 완료 처리할 이슈 선택

```bash
gh issue list --assignee "@me" --state open --json number,title,labels,url --limit 50
```

- 인자로 이슈 번호(`#N` 또는 `N`)를 받으면 그 이슈를 사용.
- 없으면 목록을 정리해 `AskUserQuestion`으로 하나 선택받는다.
- 머지 직후라 이슈가 이미 닫힌 경우도 있으므로, 못 찾으면 `--state closed` 최근 목록도 확인해 보드 정리만 남았는지 본다.

## 2. `output` 판별

- `docs/work/todo/*.md` 중 front-matter `issue:` 가 일치하는 문서의 `output` 값을 사용.
- 없으면 "결과물이 레포에 들어가는 작업이었나"를 `AskUserQuestion`으로 확정.

## 3-A. `output: none` — 이슈 닫기

```bash
gh issue close <N> --reason completed
```

## 3-B. `output: repo` — 머지 확인 후 마무리

```bash
gh pr list --state all --search "<N> in:body" --json number,state,isDraft,url \
  --jq '.[] | select(.state != null)'
```

- 연결 PR(본문 `Closes #N`)을 찾아 상태를 확인한다:
  - **MERGED** → `Closes #N` 으로 이슈가 자동으로 닫혔는지 확인. 안 닫혔으면 `gh issue close <N> --reason completed`.
  - **OPEN** → "PR #M 이 아직 머지되지 않았습니다. 리뷰/머지 후 다시 실행하세요." 안내 후 **중단** (보드도 옮기지 않음).
  - **CLOSED(미머지)** → 작업이 취소된 것인지 사용자에게 확인 후 처리 방향을 정한다.
  - PR이 없으면 → 사용자에게 상황을 확인한다 (PR 없이 dev 에 반영됐는지 등).

## 4. 보드 상태 → `작업 완료` (공통, best-effort)

`/work-issue` 와 동일한 gh project 패턴을 사용한다:

```bash
OWNER="moodme-teo"
PNUM=$(gh project list --owner "$OWNER" --format json \
  | python3 -c "import sys,json;print(next((p['number'] for p in json.load(sys.stdin)['projects'] if p['title']=='무드미 MVP'),''))")
gh project item-list "$PNUM" --owner "$OWNER" --format json --limit 100   # 이슈 번호로 item id 찾기
gh project field-list "$PNUM" --owner "$OWNER" --format json             # Status 필드 id + '작업 완료' 옵션 id
gh project item-edit --project-id <PROJECT_NODE_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <작업완료_OPTION_ID>
```

- 실패(권한/필드 없음)해도 경고만 남기고 계속. `missing required scopes` 면 `! gh auth refresh -s project` 안내.
- Projects 내장 workflow(Item closed → 작업 완료)가 켜져 있으면 이미 이동돼 있을 수 있다 — 그 경우 확인만 하고 넘어간다.

## 5. 결과 보고

- ✅ 이슈: `#N` CLOSED (completed)
- (`output: repo`) 🔀 PR: `#M` MERGED
- 📋 보드: `작업 완료` 로 이동
