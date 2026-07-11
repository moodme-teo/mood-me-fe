---
name: work-work
argument-hint: "[이슈번호(예: #28) — 생략하면 목록에서 선택]"
description: 나에게 배정된(또는 미배정) 열린 GitHub 이슈 목록을 불러와 그중 작업할 것을 선택하면, 이슈 본문의 명세대로 구현하고 컨벤션에 맞춰 커밋한 뒤 PR까지 생성합니다. 미배정 이슈를 고르면 본인에게 배정됩니다. PR에는 페이지 라벨을 붙입니다. 리뷰어는 자동 지정하지 않으며, 사용자가 원할 때 직접 지정합니다(지정 시 Discord 알림). 작업을 시작할 때 사용합니다.
---

# /work-work — 이슈 선택 → 구현 → 커밋 → PR

나에게 배정된 이슈(또는 미배정 백로그 이슈) 중 하나를 골라, 이슈 본문의 명세대로 구현하고 PR을 올린다.

## 0. 사전 점검

```bash
gh --version >/dev/null 2>&1 || echo "NO_GH"
gh auth status  >/dev/null 2>&1 || echo "NO_AUTH"
git status --porcelain            # 워킹트리 확인
```

- `NO_GH` / `NO_AUTH` → `/work-issue`와 동일하게 안내 후 중단.
- 워킹트리에 커밋 안 된 변경이 있으면 → 사용자에게 "커밋되지 않은 변경이 있습니다. 계속하면 새 브랜치에 함께 올라갈 수 있어요. 진행할까요?"라고 확인.

## 1. 작업할 이슈 불러오기 & 선택

**나에게 배정된 이슈**와 **미배정 이슈**(백로그에서 집어갈 것)를 모두 불러온다:

```bash
gh issue list --assignee "@me" --state open \
  --json number,title,labels,url --limit 50
gh issue list --state open --search "no:assignee" \
  --json number,title,labels,url --limit 50
```

- **인자로 이슈 번호(`#N` 또는 `N`)를 받았으면** 목록에서 그 이슈를 찾아 바로 진행한다 (선택 질문 생략). 닫혀 있거나 없는 번호면 안내 후 중단.
- 둘 다 **0개** → "작업할 열린 이슈가 없습니다. `/work-issue`로 먼저 등록하세요." 후 중단.
- 인자가 없으면 두 그룹을 구분해(`내 이슈` / `미배정 — 집어가기`) 번호·제목·라벨로 정리하고 `AskUserQuestion`으로 **어떤 이슈를 작업할지 하나 선택**받는다. (한 번에 하나만 진행)
- **미배정 이슈를 선택했으면 그 즉시 본인에게 배정한다:**

```bash
gh issue edit <번호> --add-assignee "@me"
```

## 2. 명세 확보

선택한 이슈에서 작업 명세를 찾는다.

1. **이슈 본문**(개요/작업 내용/완료 조건)을 명세로 사용한다 — `/work-issue` 가 명세를 이슈 본문에 작성한다.
2. 본문에 명세가 부실하면(체크리스트 없음 등) 레거시 경로를 확인한다: `docs/work/todo/*.md` 중 front-matter `issue:` 값이 이슈 번호와 일치하는 문서, 또는 본문 `## 🔗 참고`에 적힌 문서 경로.
3. 그래도 명세가 없으면 이슈 제목·PRD를 근거로 작업 범위를 정리해 사용자에게 확인받고 진행한다.

명세의 **✅ 작업 내용** 체크리스트와 **🎯 완료 조건**을 구현 기준으로 삼는다.

또한 다음을 확보한다:

- **type**(커밋 prefix): 이슈 제목의 브래킷에서 역산한다 — `[Feat] …` → `feat`, `[Chore] …` → `chore`. 브래킷이 없으면 `AskUserQuestion`으로 확정.
- **페이지 라벨**(PR에 그대로 붙임): 이슈에 붙은 라벨 중 페이지/범위 라벨(`로그인|메인|테스트|보드생성|보드편집|보드완성|전역|운영|품질|디자인`)을 사용. 없으면 `AskUserQuestion`으로 확정.

## 3. 작업 브랜치 생성 (feature 브랜치)

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

**보드 상태 이동 (best-effort — 실패해도 계속 진행):** 작업을 시작했으므로 `무드미 MVP` 보드에서 이 이슈의 Status를 `진행중`으로 옮긴다. `/work-issue` 스킬 6단계와 같은 방식(`gh project item-edit`)으로 처리하고, 권한/필드 문제로 실패하면 경고 한 줄만 남긴다.

상태 이동에 성공했으면 Discord 보드 알림도 보낸다 (best-effort — 이슈 생성/닫힘은 워크플로우가 자동 감지하지만, 보드 상태만 옮기는 건 이슈 이벤트가 없어 직접 호출해야 한다):

```bash
gh workflow run discord-board-notify.yml -f issue=<번호> -f from="백로그" -f to="진행중"
```

## 4. 구현

⚠️ **이 저장소의 Next.js는 학습 데이터와 다릅니다.** 코드를 쓰기 전 `AGENTS.md` 지침대로 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 읽고, deprecation 경고를 따른다.

- 명세의 **작업 내용** 체크리스트를 순서대로 구현한다.
- UI 작업이면 팀 디자인 스킬 `impeccable` 기준(`PRODUCT.md`/`DESIGN.md`)을 따른다. UI 파일 편집 시 자동 detector가 도는 점을 고려한다.
- 커밋 컨벤션 등 프로젝트 규칙(`docs/convention/`)을 준수한다.
- 구현 중 판단이 어려운 스펙 공백은 임의로 넘겨짚지 말고 사용자에게 확인한다.

## 5. 커밋 (컨벤션 필수)

커밋 메시지는 **반드시** `<prefix> : <메시지>` 형식 (Husky `commit-msg` 훅이 강제, 안 맞으면 커밋 거부됨).

- prefix는 이슈 `type`을 사용. 예: `feat : 무드보드 공유 버튼 추가`
- 논리 단위로 나눠 커밋해도 되고, 작으면 한 커밋도 무방.
- 본문 마지막 줄에 이슈 연결을 남기는 것을 권장: `Refs #42` (닫기는 PR에서 처리).

```bash
git add -A
git commit -m "feat : 무드보드 공유 버튼 추가"
```

## 6. 푸시 & PR 생성

```bash
git push -u origin <브랜치명>
gh pr create \
  --base dev \
  --head <브랜치명> \
  --title "feat : 무드보드 공유 버튼 추가" \
  --body-file <임시 PR 본문 파일> \
  --label "<페이지 라벨>" \
  --assignee "@me"
```

- **PR 제목**: 커밋 컨벤션과 동일하게 `<prefix> : <메시지>` (예: `feat : 무드보드 공유 버튼 추가`).
- **라벨**: 이슈와 동일한 **페이지 라벨** 을 붙인다(2단계에서 확보).
- **reviewer**: **자동 지정하지 않는다.** 리뷰 받을 준비가 되면 사용자가 직접 지정한다 — GitHub UI 또는:

  ```bash
  gh pr edit <N> --add-reviewer <로그인명>
  ```

  리뷰어를 지정하면 Discord 로 알림이 간다 (`.github/workflows/discord-review-notify.yml`).

- **PR 본문 템플릿**:

```markdown
## 작업 내용

- 명세 체크리스트를 실제로 구현한 항목 요약

## 관련 이슈

Closes #42

## 완료 조건 확인

- [x] (명세의 완료 조건 항목들)

## 리뷰 포인트

- 리뷰어가 특히 봐줬으면 하는 부분
```

- `Closes #42` 로 머지 시 이슈가 자동으로 닫히게 한다.
- ⚠️ **PR은 보드(`무드미 MVP`)에 추가하지 않는다.** 보드에는 이슈만 올린다. PR은 `Closes #N` 로 연결되어 이슈 카드에 배지로 표시되고, 머지되면 이슈가 자동으로 `작업 완료`로 이동한다. PR을 별도 카드로 올리면 같은 작업이 중복으로 보인다.

## 7. 결과 보고

- 🌿 브랜치: `feat/login` (dev 기준)
- 🔀 PR: URL + `#N` (base: dev)
- 🏷 라벨: <페이지> · 👀 리뷰어: 미지정 (리뷰 받을 준비가 되면 `gh pr edit <N> --add-reviewer <로그인명>` — 지정 시 Discord 알림)
- 🔗 `Closes #42` 로 연결됨 → 머지 시 이슈 자동 종료
- 다음 단계: 리뷰어 지정 → 리뷰 → `/work-done` 으로 머지·완료 처리 (GitHub에서 직접 머지해도 됨)

> 이 스킬은 PR 생성까지만 한다. 머지는 리뷰 이후 `/work-done` 또는 사람이 GitHub에서 진행한다. `dev`/`main`에 직접 push하지 않는다.
