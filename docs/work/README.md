# 작업 워크플로우 (docs/work)

무드미 팀은 **AI로 이슈 등록 → 배정 → 구현 → PR → 리뷰 → 머지** 흐름으로 작업합니다.
그중 이슈 등록과 구현/PR 을 두 개의 스킬로 자동화했습니다.

```
docs/work/todo 문서 작성 ──/work-issue──▶ GitHub 이슈(배정+보드) ──/work-work──▶ 구현+커밋+PR ──▶ 리뷰 ──▶ 머지
```

## 최초 1회

```bash
brew install gh                   # GitHub CLI
gh auth login                      # GitHub.com / HTTPS / 브라우저 인증
gh auth refresh -s project         # 프로젝트 보드(백로그 자동 배치)용 권한 추가
```

> `project` 스코프가 없으면 이슈 생성/배정까지는 되지만 **보드 자동 배치가 안 됩니다.**
> `error: ... missing required scopes [read:project]` 가 뜨면 위 refresh 명령을 실행하세요.

## 1. 작업 문서 쓰기

`docs/work/_template.md` 를 복사해서 **`docs/work/todo/`** 안에 새 파일로 저장하고 내용을 채웁니다. **파일명은 자유**입니다.

```bash
cp docs/work/_template.md docs/work/todo/share-button.md
```

- `type`: 커밋 prefix와 동일 (`feat|fix|refactor|rename|remove|style|chore|docs|hotfix|test|perf`)
- `title`: 이슈 제목 (앞에 `[Feat]` 처럼 타입 첫 글자만 대문자로 자동 부착)
- `page`: 페이지 라벨. 아래 6개 중 하나 — `로그인` · `메인` · `테스트` · `보드생성` · `보드편집` · `보드완성`
- `issue`: **비워두세요.** 등록 후 스킬이 번호를 채웁니다.
- **✅ 작업 내용** / **🎯 완료 조건** 을 최대한 구체적으로 — `/work-work` 가 이대로 구현합니다.

## 2. `/work-issue` — 이슈 등록

문서를 저장한 뒤 실행하면:

- `docs/work/todo`의 미등록 문서를 찾아(여러 개면 선택) GitHub 이슈로 등록 — **시안 A(이모지 브래킷형)**
- **문서 작성자(=실행한 본인)** 에게 자동 배정
- **페이지 라벨**(`page` 값) 부착
- **무드미 MVP 보드 → 백로그** 에 추가
- 문서 front-matter의 `issue:` 에 번호 자동 기록

## 3. `/work-work` — 구현 & PR

실행하면:

- **나에게 배정된** 열린 이슈 목록을 불러와 작업할 이슈를 선택
- 연결된 `docs/work` 명세대로 구현 (`dev` 기준 새 브랜치)
- 커밋 컨벤션(`<prefix> : <메시지>`)에 맞춰 커밋
- `dev` 로 향하는 **PR 생성** — **페이지 라벨** 부착 + **본인 제외 협업자 전원**을 리뷰어로 지정 (`Closes #N` 로 이슈 연결)

이후 **리뷰 → 머지** 는 사람이 진행합니다. (스킬은 절대 직접 머지하지 않습니다.)

## 브랜치 전략

```
main ───────────────●──────────────▶  release 된 것 (배포)
                     ▲ merge
dev ──●────●────●────●──────────────▶  개발 통합 (feature PR을 squash-merge)
       ▲         │
       │ 브랜치   │ PR → merge
feature ●────────┘                      dev에서 따서 작업
```

- **main**: release 기준. dev가 안정화되면 main으로 merge.
- **dev**: 개발 통합 브랜치. 모든 feature PR은 여기로 **squash-merge**.
- **feature**: `dev`에서 따서 작업 → PR 생성 → `dev`로 merge.

**브랜치 컨벤션**: `<prefix>/<작업명>` (prefix = 커밋 타입, 작업명 = 영문 kebab-case)

```
feat/login      fix/board-export      refactor/test-flow
```

> `/work-work` 실행 시 이 규칙대로 `dev` 기준 feature 브랜치가 자동 생성됩니다.

## 이슈 / PR 컨벤션 (시안 A)

```
이슈 제목:  [Feat] 무드보드 공유 버튼 추가   ← [타입 첫 글자만 대문자] + 제목
PR 제목:    feat : 무드보드 공유 버튼 추가   ← 커밋 컨벤션과 동일
라벨:       페이지 단위 — 로그인·메인·테스트·보드생성·보드편집·보드완성
배정:       문서 작성자(본인)
리뷰어:     본인 제외 협업자 전원 (PR 한정)
보드:       무드미 MVP · 백로그

이슈 본문:
  ## 📋 개요        (배경/근거)
  ## ✅ 작업 내용    (구현 체크리스트)
  ## 🎯 완료 조건    (리뷰/머지 기준)
  ## 🔗 참고         (원본 문서 경로 + 링크)
```
