---
name: work-done
argument-hint: [이슈번호]
description: 나에게 배정된 이슈 중 끝난 작업을 완료 처리합니다. 연결 PR이 있으면 dev 로 squash-merge 해 닫고(이슈는 Closes 로 자동 종료), PR이 없는 작업(레포 결과물 없음)은 이슈만 닫습니다. GitHub에서 사람이 직접 머지해도 됩니다 — 이 스킬은 그 경우 이슈가 닫혔는지만 확인합니다. 보드 상태 이동은 GitHub Projects 자동화가 처리합니다. 작업이 끝났을 때 사용합니다.
---

# /work-done — 이슈 완료 처리 (PR 머지 / 이슈 닫기)

끝난 작업을 마무리한다. **연결 PR이 있으면 PR을 머지해 닫고, PR이 없으면 이슈만 닫는다.**
머지는 이 스킬로 해도 되고 GitHub에서 사람이 직접 해도 된다 — 어느 쪽이든 결과는 같다.
**보드는 건드리지 않는다** — 이슈가 닫히면 GitHub Projects 자동화가 `작업 완료`로 옮긴다.

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

## 2. 연결 PR 찾기

이슈 본문을 `Closes #N` 으로 연결한 PR을 찾는다:

```bash
gh pr list --state all --search "Closes #<N> in:body" \
  --json number,state,isDraft,reviewDecision,url
```

## 3. 상태별 처리

- **OPEN PR** → 머지를 진행한다.
  - 리뷰 상태(`reviewDecision`)와 체크 상태를 요약해 보여주고, **승인 없이 머지하는 경우라면 사용자에게 한 번 확인**받는다.
  - 브랜치 전략대로 **squash-merge** 하고 feature 브랜치를 정리한다:

  ```bash
  gh pr merge <M> --squash --delete-branch
  ```

  - 머지되면 `Closes #N` 으로 이슈가 자동으로 닫힌다. 안 닫혔으면 `gh issue close <N> --reason completed`.
- **MERGED PR** → 사람이 이미 GitHub에서 머지한 경우. 이슈가 닫혔는지만 확인하고, 안 닫혔으면 닫는다.
- **CLOSED PR (미머지)** → 작업이 취소된 것인지 사용자에게 확인 후 처리 방향을 정한다.
- **PR이 없으면** → "레포에 들어가는 결과물이 없는 작업이었나"를 `AskUserQuestion`으로 확인한다.
  - 맞으면(문서 외 작업, 조사, 신청 등) 이슈만 닫는다: `gh issue close <N> --reason completed`
  - 아니면(구현이 필요한데 PR이 없음) → "`/work-work` 로 구현/PR을 먼저 진행하세요." 안내 후 중단.

> ⚠️ 이 스킬이 머지하는 것은 **feature → dev (squash-merge)** 뿐이다. **dev → main 은 일반 merge 로, 사람이 release 시점에 직접** 진행한다.

## 4. 보드는 자동

보드 상태 이동은 **GitHub Projects 내장 workflow** 가 처리한다 (이슈가 닫히면 `작업 완료` 로 이동). 스킬이 직접 옮기지 않는다.

- 자동화가 동작하지 않는 것 같으면 → "보드 설정(⚙️ Workflows)에서 'Item closed → 작업 완료' 를 켜세요." 한 줄만 안내.

## 5. 결과 보고

- ✅ 이슈: `#N` CLOSED (completed)
- (PR이 있던 경우) 🔀 PR: `#M` squash-merge 완료 (브랜치 삭제) / 또는 "이미 머지되어 있어 확인만 함"
- 📋 보드: GitHub 자동화가 `작업 완료` 로 이동
