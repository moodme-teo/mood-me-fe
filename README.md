# mood-me

짧은 테스트 답변을 **나만의 AI 무드보드**로 바꿔 SNS에 공유하는 감성 웹 경험.

사용자가 테스트에 답하면 → Claude가 답을 이미지 프롬프트·키워드·무드 성향으로 변환하고 → fal.ai(Flux schnell)가 이미지를 실시간으로 생성해 보드를 채우며 → Konva 캔버스에서 꾸민 뒤 → PNG로 내보내 공유합니다.

제품·디자인 배경은 [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md) 참고.

## 기술 스택

| 영역                 | 사용 기술                                       |
| -------------------- | ----------------------------------------------- |
| 프레임워크           | Next.js 16 (App Router) · React 19 · TypeScript |
| 스타일               | Tailwind CSS v4                                 |
| 인증 · DB · 스토리지 | Supabase (`@supabase/ssr`)                      |
| 이미지 생성          | fal.ai — Flux schnell                           |
| 텍스트/키워드 생성   | Anthropic Claude (`claude-haiku-4-5`)           |
| 캔버스 편집          | Konva · react-konva                             |
| 애니메이션           | Framer Motion                                   |

## 사전 요구사항

- **Node.js 24 이상** (`.nvmrc` 참고 — `nvm use` 로 적용)
- npm (저장소에 `package-lock.json` 포함)
- 아래 서비스의 API 키:
  - [Supabase](https://supabase.com) 프로젝트 (URL · anon key · service role key)
  - [fal.ai](https://fal.ai) API 키
  - [Anthropic](https://console.anthropic.com) API 키

## 시작하기

### 1. 클론 & 의존성 설치

```bash
git clone <repo-url>
cd mood-me
npm install
```

### 2. 환경변수 설정

배포용 환경변수는 **GitHub / Vercel** 에서 관리합니다. 로컬에서 띄울 때는 프로젝트 루트에 `.env.local` 을 직접 만들고 값을 채웁니다 — **값은 팀 Figma를 참고하세요.**

| 변수                            | 설명                                         | 노출          |
| ------------------------------- | -------------------------------------------- | ------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL                        | 클라이언트    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키                        | 클라이언트    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role 키                     | **서버 전용** |
| `FAL_KEY`                       | fal.ai API 키                                | **서버 전용** |
| `ANTHROPIC_API_KEY`             | Anthropic Claude API 키                      | **서버 전용** |
| `NEXT_PUBLIC_SITE_URL`          | 앱 기본 URL (로컬은 `http://localhost:3000`) | 클라이언트    |

> ⚠️ **서버 전용** 키(`SUPABASE_SERVICE_ROLE_KEY`, `FAL_KEY`, `ANTHROPIC_API_KEY`)는 절대 클라이언트에 노출하면 안 됩니다. `src/lib/*`의 관련 모듈은 API 라우트·서버 컴포넌트 안에서만 import 하세요. `.env.local`은 `.gitignore`에 포함되어 커밋되지 않습니다.

### 3. impeccable 설치 (최초 1회) ⚠️

이 프로젝트는 [impeccable](https://github.com/pbakaus/impeccable) — AI 코딩 에이전트(**Claude Code / Codex**)가 더 나은 UI를 만들도록 돕는 디자인 스킬 — 로 프론트엔드를 개발합니다. 레포를 clone한 뒤 **각자 컴퓨터에 엔진을 1회 설치**해야 합니다.

```bash
npx impeccable install     # Claude Code / Codex 자동 감지해서 설치
```

- 팀 디자인 기준 문서(`PRODUCT.md` · `DESIGN.md`)는 **이미 레포에 있어** 자동으로 읽힙니다. 따로 만들 필요 없습니다.
- 설치하면 UI 파일 편집 시 자동으로 도는 **디자인 검사 hook**(AI 슬롭·저대비·접근성 문제 감지)도 함께 켜집니다.
- **설치하지 않으면** `/impeccable` 명령과 자동 검사가 동작하지 않습니다. clone 후 꼭 1회 실행하세요.

> 💡 개인별 hook 설정 파일(`.claude/settings.local.json` · `.codex/hooks.json`)은 머신마다 경로가 달라 `.gitignore` 처리되어 있습니다. `npx impeccable install`이 자기 경로에 맞게 자동 생성하므로 정상입니다.

**자주 쓰는 명령**

| 명령                          | 언제                           |
| ----------------------------- | ------------------------------ |
| `/impeccable shape <대상>`    | 코드 짜기 전 UX/UI 먼저 설계   |
| `/impeccable craft <대상>`    | 새 기능/화면 기획+구현 한 번에 |
| `/impeccable critique <대상>` | 화면 UX 리뷰(점수 포함)        |
| `/impeccable audit <대상>`    | 접근성·성능·반응형 점검        |
| `/impeccable polish <대상>`   | 배포 전 마감 다듬기            |

전체 명령·사용법은 [`docs/impeccable/impeccable-guide.md`](./docs/impeccable/impeccable-guide.md), 세팅 배경은 [`docs/impeccable/impeccable-setup.md`](./docs/impeccable/impeccable-setup.md) 참고. (`PRODUCT.md`·`DESIGN.md`는 팀 공용 기준 문서 — 수정은 PR로.)

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

## 사용 가능한 스크립트

| 명령            | 설명           |
| --------------- | -------------- |
| `npm run dev`   | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드  |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint`  | ESLint 검사    |

## 프로젝트 구조

```
src/
├── app/                  # Next.js App Router (레이아웃·페이지·전역 스타일)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── canvas/           # Konva 무드보드 캔버스
│       └── BoardCanvas.tsx
└── lib/
    ├── anthropic.ts      # Claude 클라이언트 (서버 전용)
    ├── fal.ts            # fal.ai 클라이언트 (서버 전용)
    └── supabase/
        ├── client.ts     # 브라우저용 Supabase 클라이언트
        └── server.ts     # 서버용 Supabase 클라이언트 (SSR)
```

> 위는 현재 스캐폴드 상태입니다. **전체 목표 구조와 배치 규칙**은 [`docs/folder-structure.md`](./docs/folder-structure.md) 참고.

## 문서

| 문서 | 내용 |
| --- | --- |
| [`docs/convention/`](./docs/convention/README.md) | 팀 컨벤션 — 커밋/브랜치·Component·State·API·Error·Naming·Type·Canvas·AI |
| [`docs/folder-structure.md`](./docs/folder-structure.md) | 폴더 구조와 배치 규칙 |
| [`docs/architecture.md`](./docs/architecture.md) | 레이어 · 데이터/AI/Canvas 흐름 |
| [`docs/glossary.md`](./docs/glossary.md) | 도메인 용어사전 |
| [`docs/prd/`](./docs/prd/mood-me-prd.md) | 제품 요구사항(PRD) |

## 커밋 컨벤션

모든 커밋 메시지는 `<prefix> : <메시지>` 형식을 따릅니다. (prefix 뒤 **공백 콜론 공백** 필수)

```
feat : 새로운 기능 추가
fix : 버그 및 기타 수정
refactor : 코드 리팩토링
rename : 네이밍 수정, 파일 이동, 오타 수정
remove : 파일 삭제
style : css style 관련 변경
chore : 빌드 부분 혹은 패키지 매니저, config 수정, 모듈 추가
docs : 문서 작성
hotfix : 긴급 작업
test : 테스트 코드 관련
perf : 퍼포먼스 효율 개선 관련
```

> 이 규칙은 **Husky `commit-msg` 훅으로 자동 강제**됩니다. `npm install` 시 `prepare` 스크립트가 훅을 활성화하므로 별도 설정은 필요 없습니다. 형식·prefix에 맞지 않으면 커밋이 거부됩니다. 자세한 내용은 [`docs/convention/commit-convention.md`](./docs/convention/commit-convention.md) 참고.

## 작업 워크플로우

**GitHub 이슈가 곧 todo** 입니다. 별도 todo 파일 없이, 모든 작업은 이슈로 등록되어 **무드미 MVP 프로젝트 보드**(백로그 → 진행중 → 작업 완료)에서 관리됩니다. 등록부터 완료까지 Claude Code 스킬 3개로 자동화되어 있습니다:

```
/work-issue ──▶ GitHub 이슈 등록 ──▶ /work-work ──▶ 구현 + PR ──▶ 리뷰 ──▶ /work-done ──▶ 머지 + 이슈 닫기
```

| 스킬 | 하는 일 |
| ---- | ------- |
| `/work-issue 역할, 작업이름, 일정, 페이지` | PRD·코드를 탐색해 명세(개요/작업 내용/완료 조건)를 이슈 본문으로 작성하고 즉시 등록. 라벨·배정·보드 백로그·일정 기록까지 자동. 기본은 본인 배정, `--assignee <이름>`/`--assignee none` 으로 지정·미배정 가능 |
| `/work-work` | 내 이슈 + 미배정 이슈 중 선택(미배정을 고르면 본인에게 배정) → 보드 `진행중` → `dev` 기준 feature 브랜치에서 이슈 명세대로 구현 → 커밋 → `dev` 로 향하는 PR 생성(페이지 라벨 + 본인 제외 협업자 전원 리뷰어) |
| `/work-done` | 리뷰 끝난 PR을 `dev` 로 squash-merge + 브랜치 삭제 → 이슈 자동 종료. PR 없는 작업(조사·신청 등)은 이슈만 닫음. GitHub에서 직접 머지해도 무방 |

**브랜치 전략** (머지 방식은 브랜치 룰셋으로 강제됩니다):

```
main    ← dev 안정화 시 일반 merge (release)
dev     ← feature PR을 squash-merge (개발 통합)
feature ← dev 에서 따서 작업 (예: feat/login)
```

새로 합류했다면 최초 1회 GitHub CLI 인증이 필요합니다 (`gh auth login` + `gh auth refresh -s project`). 전체 흐름·컨벤션·보드 사용법은 [`docs/work/README.md`](./docs/work/README.md) 참고.

## 참고 사항

- **Konva는 클라이언트 전용**입니다. `next.config.ts`에서 `konva`·`canvas`를 `serverExternalPackages`로 지정해 서버 번들에서 제외합니다.
- 외부 이미지는 `next.config.ts`의 `images.remotePatterns`에 허용된 호스트(`fal.media`, `**.supabase.co`)에서만 로드됩니다. 새 이미지 소스를 추가하면 이곳에 등록하세요.
- 이 저장소는 **커스텀 Next.js 규칙**을 따릅니다. 코드 작성 전 [`AGENTS.md`](./AGENTS.md)를 먼저 읽어주세요.
