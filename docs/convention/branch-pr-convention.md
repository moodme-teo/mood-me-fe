# 브랜치 / 이슈 / PR 컨벤션

워크플로우 전체(스킬 사용법 포함)는 [docs/work/README.md](../work/README.md)를 보세요. 이 문서는 규칙만 요약합니다.

## 브랜치 전략

```
main ───────────────●──────────────▶  release 된 것 (배포)
                     ▲ merge
dev ──●────●────●────●──────────────▶  개발 통합 (feature PR을 squash-merge)
       ▲         │
       │ 브랜치   │ PR → merge
feature ●────────┘                      dev에서 따서 작업
```

| 브랜치    | 역할                | 머지 방식                                                               |
| --------- | ------------------- | ----------------------------------------------------------------------- |
| `main`    | release 기준 (배포) | dev → main **일반 merge** (커밋 이력 보존) — 사람이 release 시점에 직접 |
| `dev`     | 개발 통합           | feature → dev **squash-merge** (`/work-done` 또는 GitHub에서 직접)      |
| `feature` | 작업 브랜치         | 항상 **최신 `origin/dev`에서 분기**                                     |

> 머지 방식은 브랜치 룰셋으로 강제됩니다: `dev`는 squash만, `main`은 일반 merge만 허용.
> `dev`/`main`에 직접 push하지 않습니다.

**브랜치 이름**: `<prefix>/<작업명>` — prefix는 커밋 prefix와 동일, 작업명은 영문 kebab-case

```
feat/login      fix/board-export      refactor/test-flow      docs/convention
```

## 이슈 컨벤션 (시안 A)

- **제목**: `[타입 첫 글자만 대문자] 제목` — 예: `[Feat] 로그인 페이지 구현`
  - 타입: `feat|fix|refactor|rename|remove|style|chore|docs|hotfix|test|perf`
  - `/work-work`가 이 브래킷에서 타입을 역산해 브랜치명·커밋 prefix로 사용합니다
- **본문**: [ISSUE_TEMPLATE.md](../work/ISSUE_TEMPLATE.md) 구조 — 📋 개요 / ✅ 작업 내용 / 🎯 완료 조건 / 🔗 참고 (+ 역할·일정 메타 한 줄)
- **라벨**: 페이지 단위 7개 중 하나 — `로그인` `메인` `테스트` `보드생성` `보드편집` `보드완성` `공통`
- **배정**: 기본 등록자 본인 (`--assignee`로 지정/미배정 가능 — 미배정 이슈는 집어가는 사람에게)
- **보드**: 무드미 MVP → 백로그 등록 + 일정·역할 필드 기록

## PR 컨벤션

- **제목**: 커밋 컨벤션과 동일 — `<prefix> : <메시지>` (예: `feat : 무드보드 공유 버튼 추가`)
- **base**: 항상 `dev`
- **본문**: 작업 내용 / 관련 이슈(`Closes #N` — 머지 시 이슈 자동 종료) / 완료 조건 확인 / 리뷰 포인트
- **라벨**: 이슈와 동일한 페이지 라벨
- **리뷰어**: 자동 지정하지 않습니다. **리뷰 받을 준비가 되면 작성자가 직접 지정** — 지정하면 Discord로 알림이 갑니다(멘션 태깅)
- **보드에 PR을 올리지 않습니다** — 이슈만 보드에 올리고, PR은 `Closes #N`으로 이슈 카드에 배지로 연결됩니다

## Discord 알림 (자동)

| 시점                  | 알림                       | 트리거                                  |
| --------------------- | -------------------------- | --------------------------------------- |
| PR 리뷰어 지정        | 👀 리뷰 요청 (리뷰어 멘션) | `discord-review-notify.yml`             |
| 이슈 생성/닫힘/재오픈 | 📋 보드 변경               | `discord-board-notify.yml` (자동 감지)  |
| 보드 진행중 이동      | 📋 보드 변경               | `/work-work`가 workflow_dispatch로 호출 |

> 보드에서 카드를 손으로 드래그한 변경은 감지되지 않습니다.
