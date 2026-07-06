---
name: work-done
description: 나에게 배정된 이슈 중 끝난 작업을 완료 처리합니다. 레포 결과물이 없는 작업(output none)은 이슈만 닫고, 레포 결과물이 있는 작업(output repo)은 연결 PR을 dev 로 squash-merge 해 닫습니다(이슈는 Closes 로 자동 종료). 보드 상태 이동은 GitHub Projects 자동화가 처리하므로 직접 옮기지 않습니다. 작업이 끝났을 때 사용합니다.
---

# /work-done — 이슈 완료 처리 (이슈 닫기 / PR 머지)

끝난 작업을 마무리한다. **이슈만 있으면 이슈를 닫고, PR도 있으면 PR을 머지해 닫는다.**
**보드는 건드리지 않는다** — 이슈/PR이 닫히면 GitHub Projects 자동화가 상태를 옮긴다.

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

## 2. `output` 판별

- `docs/work/todo/*.md` 중 front-matter `issue:` 가 일치하는 문서의 `output` 값을 사용.
- 없으면 "결과물이 레포에 들어가는 작업이었나"를 `AskUserQuestion`으로 확정.

## 3-A. `output: none` — 이슈 닫기

```bash
gh issue close <N> --reason completed
```

## 3-B. `output: repo` — PR 머지로 마무리

연결 PR(본문 `Closes #N`)을 찾는다:

```bash
gh pr list --state all --search "Closes #<N> in:body" \
  --json number,state,isDraft,reviewDecision,url
```

PR 상태별 처리:

- **OPEN** → 머지를 진행한다.
  - **draft 상태면** ready 전환이 누락된 것 — 사용자에게 확인 후 `/work-work` 6단계(본문 체크리스트 채우기 + 리뷰어 지정 + `gh pr ready`)를 먼저 수행한다.
  - 리뷰 상태(`reviewDecision`)와 체크 상태를 요약해 보여주고, **승인 없이 머지하는 경우라면 사용자에게 한 번 확인**받는다.
  - 브랜치 전략대로 **squash-merge** 하고 feature 브랜치를 정리한다:

  ```bash
  gh pr merge <M> --squash --delete-branch
  ```

  - 머지되면 `Closes #N` 으로 이슈가 자동으로 닫힌다. 안 닫혔으면 `gh issue close <N> --reason completed`.
- **MERGED** → 이슈가 닫혔는지만 확인하고, 안 닫혔으면 닫는다.
- **CLOSED(미머지)** → 작업이 취소된 것인지 사용자에게 확인 후 처리 방향을 정한다.
- **PR이 없으면** → 사용자에게 상황을 확인한다 (PR 없이 dev 에 반영됐는지 등).

## 4. 보드는 자동

보드 상태 이동은 **GitHub Projects 내장 workflow** 가 처리한다 (이슈/PR이 닫히면 `작업 완료` 로 이동). 스킬이 직접 옮기지 않는다.

- 자동화가 동작하지 않는 것 같으면 → "보드 설정(⚙️ Workflows)에서 'Item closed → 작업 완료' 를 켜세요." 한 줄만 안내.

## 5. 결과 보고

- ✅ 이슈: `#N` CLOSED (completed)
- (`output: repo`) 🔀 PR: `#M` squash-merge 완료 (브랜치 삭제)
- 📋 보드: GitHub 자동화가 `작업 완료` 로 이동
