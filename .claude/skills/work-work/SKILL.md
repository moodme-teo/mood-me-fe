---
name: work-work
description: 나에게 배정된 열린 GitHub 이슈 목록을 불러와 그중 작업할 것을 선택하면, docs/work의 명세대로 구현하고 컨벤션에 맞춰 커밋한 뒤 PR까지 생성합니다. PR에는 페이지 라벨을 붙이고 본인을 제외한 협업자 전원을 리뷰어로 지정합니다. 배정받은 작업을 시작할 때 사용합니다.
---

# /work-work — 배정된 이슈 선택 → 구현 → 커밋 → PR

나에게 배정된 이슈 중 하나를 골라, 연결된 `docs/work` 명세대로 구현하고 PR을 올린다.

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

## 2. 명세 확보

선택한 이슈에서 작업 명세를 찾는다.

1. `docs/work/*.md` 중 front-matter `issue:` 값이 **선택한 이슈 번호와 일치**하는 문서를 찾아 읽는다(가장 신뢰할 수 있는 출처).
2. 못 찾으면 이슈 본문의 `## 🔗 참고`에 적힌 `docs/work/...` 경로를 사용한다.
3. 그래도 없으면 이슈 본문 자체(개요/작업 내용/완료 조건)를 명세로 사용한다.

명세의 **✅ 작업 내용** 체크리스트와 **🎯 완료 조건**을 구현 기준으로 삼는다.

또한 **페이지 라벨**을 확보한다(PR에 그대로 붙임):
- docs 문서 front-matter `page` 값을 우선 사용.
- 없으면 이슈에 붙은 라벨 중 페이지 라벨(`로그인|메인|테스트|보드생성|보드편집|보드완성`)을 사용.
- 그래도 없으면 `AskUserQuestion`으로 어떤 페이지인지 물어 확정.

## 3. 작업 브랜치 생성

- 기준 브랜치: 팀 통합 브랜치 **`dev`** (원격 최신 반영).
- 브랜치명: `<type>/#<이슈번호>-<영문-슬러그>` (슬러그는 제목 기반 kebab-case, 없으면 이슈번호만)

```bash
git fetch origin
git switch -c "feat/#42-share-button" origin/dev
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

**reviewer 목록 계산 — 본인을 제외한 레포 협업자 전원:**

```bash
ME=$(gh api user -q .login)
REVIEWERS=$(gh api repos/moodme-teo/mood-me-fe/collaborators --jq '.[].login' \
  | grep -v "^${ME}$" | paste -sd, -)
echo "reviewers=$REVIEWERS"   # 예: hyeon-aa,Haegnim
```

```bash
git push -u origin <브랜치명>
gh pr create \
  --base dev \
  --head <브랜치명> \
  --title "feat : 무드보드 공유 버튼 추가" \
  --body-file <임시 PR 본문 파일> \
  --label "<페이지 라벨>" \
  --assignee "@me" \
  --reviewer "$REVIEWERS"
```

- **PR 제목**: 커밋 컨벤션과 동일하게 `<prefix> : <메시지>` (예: `feat : 무드보드 공유 버튼 추가`).
- **라벨**: 이슈와 동일한 **페이지 라벨** 을 붙인다(2단계에서 확보).
- **reviewer**: **본인을 제외한 협업자 전원**. reviewer가 0명이면(협업자가 본인뿐) `--reviewer` 는 생략한다.
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

- 🌿 브랜치: `feat/#42-share-button`
- 🔀 PR: URL + `#N`
- 🏷 라벨: <페이지> · 👀 리뷰어: <본인 제외 협업자>
- 🔗 `Closes #42` 로 연결됨 → 머지 시 이슈 자동 종료
- 다음 단계: 리뷰 → 머지

> 절대 임의로 `dev`/`main`에 직접 push하거나 머지하지 않는다. 머지는 리뷰 이후 사람이 결정한다.
