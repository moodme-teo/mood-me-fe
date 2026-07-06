# 작업 워크플로우 (docs/work)

무드미 팀은 **todo 등록 → AI 이슈화 → 배정 → 작업 시작 → 구현/PR → 리뷰 → 완료 처리(머지·이슈 닫기)** 흐름으로 작업합니다.
todo 등록, 이슈 등록, 작업 시작/PR, 완료 처리를 네 개의 스킬로 자동화했습니다.

```
/work-todo ──▶ todo-list.md ──/work-issue a1──▶ 이슈 문서 초안 + GitHub 이슈(배정+라벨+보드+일정)
 (번호 자동 부여)  (사람이 관리)                  (docs/work/todo/, output: repo|none 분류)

/work-work
   ├─ output: repo ──▶ 브랜치 + draft PR 즉시 오픈 ──▶ 구현·커밋 ──▶ ready for review ──▶ 리뷰 ──▶ /work-done (squash-merge → 이슈 자동 닫힘)
   └─ output: none ──▶ PR 없음, 이슈로만 추적 ─────────────────────▶ 작업 끝 ──▶ /work-done (이슈 닫기)
```

> **PR 정책**: PR은 **레포에 들어갈 결과물(코드·문서·설정 등)이 있는 작업에만** 엽니다. 신청·회의·이름 선정처럼 레포 밖에서 끝나는 작업은 PR 없이 이슈로만 관리합니다. repo 작업은 진행중 표시를 위해 **작업 시작 시 draft PR을 미리 열고**, 커밋을 쌓다가 완료 조건 충족 시 ready for review 로 전환합니다.
> **보드 상태 이동은 GitHub Projects 자동화가 처리** 하므로 스킬이 직접 옮기지 않습니다.

## 최초 1회

```bash
brew install gh                   # GitHub CLI
gh auth login                      # GitHub.com / HTTPS / 브라우저 인증
gh auth refresh -s project         # 프로젝트 보드(백로그·일정 자동 기록)용 권한 추가
```

> `project` 스코프가 없으면 이슈 생성/배정까지는 되지만 **보드 자동 배치와 일정 기록이 안 됩니다.**
> `error: ... missing required scopes` 가 뜨면 위 refresh 명령을 실행하세요.

## 디렉터리 구조

```
docs/work/
├── README.md              # 이 문서
├── ISSUE_TEMPLATE.md      # 이슈 문서 템플릿 — /work-issue 가 초안 작성 시 사용
├── plan/
│   └── todo-list.md       # 역할별 팀 todo — 사람이 관리, 번호는 /work-todo 가 부여
└── todo/                  # 실제 구현사항 정리
    ├── a1-image-collection.md   # 이슈 문서 (번호-작업명 네이밍, 스킬이 자동 생성)
    └── reference/         # 작업 자료 (수집 이미지 등, 필요 시)
```

## 1. `/work-todo` — todo 등록 (번호 자동 부여)

`docs/work/plan/todo-list.md` 는 **역할(아키타입)별 팀 todo** 를 모은 문서입니다.
역할: 💡 프로토타이퍼 · 🚀 빌더 · 🧹 스위퍼 · 📈 그로워 · 🛠 메인테이너 · 🎨 UXUI Leader · 📋 PM

```
/work-todo 빌더, 로그인 페이지 구현, 26.07.06~26.07.12, 로그인
```

- 번호(`a1, a2, …`)는 **전역 고유값** — 스킬이 자동 부여하며 직접 매기지 않습니다. 삭제된 번호도 재사용하지 않습니다.
- 작업이름·일정·페이지는 직접 수정해도 됩니다. 번호·이슈 열만 스킬이 관리합니다.
- 일정 형식: `26.07.06~26.07.12` / 페이지: 아래 라벨 7개 중 하나

## 2. `/work-issue <번호>` — 이슈 문서 초안 + 이슈 등록

```
/work-issue a1
```

- todo-list.md 에서 해당 item(역할·작업이름·일정·페이지)을 찾고
- **프로젝트(PRD·코드)를 탐색해 `docs/work/todo/<번호>-<작업명>.md` 초안을 자동 작성** — 사용자 확인 후 진행
  - front-matter에 **`output: repo | none`** (레포 결과물 유무)을 함께 분류 — 이후 PR을 열지 말지의 기준
- GitHub 이슈로 등록 — **시안 A(이모지 브래킷형)**, **실행한 본인** 에게 자동 배정, **페이지 라벨** 부착
- **무드미 MVP 보드 → 백로그** 추가 + **날짜 필드에 일정 기록** (일정 뷰에 표시됨)
- 이슈 번호를 **이슈 문서 front-matter(`issue: N`)와 todo-list.md 이슈 열(`#N`)** 에 역기록

## 3. `/work-work` — 작업 시작 (draft PR)

실행하면:

- **나에게 배정된** 열린 이슈 목록을 불러와 작업할 이슈를 선택
- **`output: repo`** 인 작업만:
  - `dev` 기준 새 브랜치 생성 + **draft PR 즉시 오픈** (`Closes #N`, 페이지 라벨, 본인 배정 — 산출물이 없으면 빈 커밋으로 시작)
  - 연결된 `docs/work/todo` 명세대로 구현, 커밋 컨벤션(`<prefix> : <메시지>`)에 맞춰 커밋·푸시
  - 완료 조건 충족 시 **ready for review 전환 + 본인 제외 협업자 전원을 리뷰어로 지정**
- **`output: none`** 인 작업은 PR 없이 여기서 끝 — 작업이 끝나면 `/work-done` 으로 완료 처리

**리뷰가 끝나면 `/work-done` 으로 머지·완료 처리** 합니다. (`/work-work` 는 직접 머지하지 않습니다.)

## 3-1. `/work-done` — 완료 처리 (이슈 닫기 / PR 머지)

작업이 끝났을 때 실행하면:

- `output: none` → 이슈를 닫습니다(completed)
- `output: repo` → 연결 PR을 `dev` 로 **squash-merge** 해 닫습니다 (draft 상태면 ready 전환부터, 승인 없으면 사용자 확인 후 진행. 이슈는 `Closes #N` 로 자동 닫힘)

보드 이동은 하지 않습니다 — 이슈/PR이 닫히면 **GitHub Projects 자동화가 `작업 완료` 로 옮깁니다.**

## 4. 일정관리 · 시각화

별도 인프라 없이 **GitHub Projects(무드미 MVP)** 를 사용합니다.

- **상태**: Board 뷰 — 백로그 → 진행중 → 작업 완료 (상태 이동은 GitHub Projects 자동화가 처리)
- **일정**: **`일정` Roadmap 뷰** — 날짜 필드 기준으로 이슈가 타임라인(간트형)에 표시됩니다. `/work-issue` 가 todo 일정을 날짜 필드에 자동 기록하므로 별도 관리가 필요 없습니다.
  - 뷰 설정(⚙️)의 **Date fields** 에 시작/종료 날짜 필드가 지정되어 있어야 합니다.
- Discord에는 보드 링크를 고정해 두고, 들어가서 확인합니다 (알림 없음).

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
이슈 제목:  [Feat] 로그인 페이지 구현     ← [타입 첫 글자만 대문자] + 제목
PR 제목:    feat : 로그인 페이지 구현     ← 커밋 컨벤션과 동일
라벨:       페이지 단위 — 로그인·메인·테스트·보드생성·보드편집·보드완성·공통
배정:       실행한 본인
리뷰어:     본인 제외 협업자 전원 (PR 한정 — draft 단계에서는 미지정, ready for review 전환 시 지정)
보드:       무드미 MVP · 백로그 (+ 일정 기록)

이슈 본문:
  ## 📋 개요        (배경/근거)
  ## ✅ 작업 내용    (구현 체크리스트)
  ## 🎯 완료 조건    (리뷰/머지 기준)
  ## 🔗 참고         (원본 문서 경로 + 링크)
```
