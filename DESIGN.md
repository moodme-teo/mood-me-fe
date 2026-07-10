---
name: mood-me
description: 테스트 답변을 나만의 AI 무드보드로 바꿔 SNS에 공유하는 감성 경험
---

# Design System: mood-me

> 이 문서는 확정된 디자인 시스템 핸드오프 번들(Claude Design)에서 추출한 **실제 시각 토큰**을 반영한다. 토큰의 단일 진실 소스는 [`src/app/globals.css`](./src/app/globals.css)이며, 이 문서는 그 값의 근거와 사용 규칙을 설명한다. 전략 방향(북극성·원칙·금지사항)은 [`PRODUCT.md`](./PRODUCT.md)에서 확정된다.

## 1. Overview

**Creative North Star: "채워지는 꿈 (A Dream, Filling In)"**

mood-me의 시각 시스템은 두 개의 결을 동시에 잡는다: **몽환적이고 감각적인 결과물**과, **BeReal·Duolingo처럼 친근하고 즉각적인 조작감**. 핵심 긴장은 하나 — _감각은 높이되, 사용은 쉽게_. 무드보드는 화면의 주인공이고, UI는 그것을 돋보이게 하려 물러선다. 생성 과정(로딩)은 "기다림"이 아니라 눈앞에서 "채워지는 설렘"으로 연출된다.

**시각 언어의 축:** 웜그레이 50 배경 위에서, 결과 캔버스와 카드가 부드럽게 떠오른다. 깊이는 검정 그림자가 아니라 **색조 그림자(color-tinted shadow)**로 표현된다. 색은 flat 단색이 아니라 **글로우 그라디언트**(hue+명도 대비를 가로지르는 2-stop)로 쓰인다. UI는 hover 시 위로 떠오르고 press 시 눌리는, 물리적으로 "만져지는" 모션을 가진다.

**Key Characteristics:**

- 결과물이 히어로, 크롬은 조연
- 몽환적 미감 + 낮은 진입장벽의 친근한 조작
- 색조 그림자로 표현하는 부드러운 깊이 (flat black 그림자 금지)
- 모든 화면이 공유(캡처) 가능한 완성도
- WCAG AA — 감각을 이유로 가독성을 타협하지 않음

## 2. Colors

무드가 색으로 표현되는 제품이므로 팔레트가 브랜드의 핵심 자산이다. 색 전략은 **Restrained 크롬 + 결과물이 색을 주도**: 앱 크롬은 웜그레이 배경과 밝은 카드 표면으로 절제하고, 밝은 팔레트는 CTA·강조·상태에만 의도적으로 등장시켜 무드보드 결과물을 돋보이게 한다.

### Neutral scale (moody warm gray)

| 토큰         | 값        | 용도                                                            |
| ------------ | --------- | --------------------------------------------------------------- |
| `--gray-900` | `#1b1715` | 본문 잉크 (`--text-primary`)                                    |
| `--gray-700` | `#463f3b` | 강한 보조 텍스트                                                |
| `--gray-500` | `#6d645f` | 보조 텍스트 (`--text-secondary`)                                |
| `--gray-300` | `#d4ceca` | 흐린 텍스트/구분선 (`--text-muted`)                             |
| `--gray-100` | `#ece8e5` | sunken 표면/테두리/placeholder (`--surface-sunken`, `--border`) |
| `--gray-050` | `#f6f4f2` | 서비스 메인 배경 (`--surface-page`, `--background`)             |

표면: `--surface-page` = `--gray-050`, `--surface-card` = `#fffdfa`, `--surface-sunken` = `--gray-100`, `--surface-inverse` = `--gray-900`. 메인 배경은 웜그레이 50으로 깔고, 카드는 더 밝은 웜화이트로 띄우며, 입력·hover·보조 패널은 gray-100으로 한 단계 내려 깊이를 만든다.

### Bright palette (deep 700 / base 500 / tint 300)

핑크·바이올렛·시안·네온그린·머스타드 5색. 각 hue는 채도 높은 `700`, 기본 `500`, 파스텔 `300`을 가진다. **300은 badge 등 compact tint, 500은 아이콘/텍스트/그림자 색, 700은 텍스트 위 강조에 쓴다.**

- Pink `#c21e74 / #ff4fa3 / #ffb3d9`
- Violet `#5b21b6 / #8b5cf6 / #cabdfb` (브랜드 앵커)
- Cyan `#0e7fa3 / #22d3ee / #a6ecf9`
- Green `#4f9e12 / #8cff3d / #cdffa8`
- Mustard `#b8790a / #ffc933 / #ffe49e`

### Glow gradients

**모든 악센트 fill 은 그라디언트다.** 단색 flat fill 은 쓰지 않는다 — 각 fill 은 hue **와** 명도/채도를 동시에 가로지르는 2-stop 그라디언트(mesh-gradient 레퍼런스 아트 기반)로, 이 hue shift 가 "글로우"를 만든다.

- `--gradient-pink` `linear-gradient(135deg, #db5375, #ffc48a)`
- `--gradient-violet` `linear-gradient(135deg, #5871f3, #0e0548)`
- `--gradient-cyan` `linear-gradient(135deg, #02c3bd, #4e148c)`
- `--gradient-green` `linear-gradient(135deg, #8bc34a, #f4d35e)`
- `--gradient-mustard` `linear-gradient(135deg, #ffc145, #ec368d)`
- `--gradient-ink` `linear-gradient(160deg, #3a3a44, #101014)` — 기본 어두운 버튼
- `*-soft` 변형: 명도 범위가 얕아 텍스트가 얹히는 compact fill(badge/chip)용

### Named Rules

- **The Gradient-Not-Flat Rule.** 악센트 표면은 항상 `--gradient-*` 토큰으로 채운다. `bg-violet-500` 같은 flat 단색 fill 은 텍스트/아이콘/그림자 색에만 쓰고, 표면 fill 로는 쓰지 않는다.
- **The No-Slop Rule (재정의).** 의도적으로 설계된 mesh 글로우 그라디언트는 브랜드 자산이다. 그러나 **`background-clip:text` 그라디언트 텍스트, 장식용 글래스모피즘, 아무 데나 뿌리는 보라→핑크 뻔한 그라디언트**는 여전히 금지 — AI 생성물 티.
- **The Readability-Wins Rule.** 몽환적 무드를 이유로 흐린 저대비 회색 텍스트를 쓰지 않는다. 본문 대비 ≥4.5:1(큰 글자 ≥3:1). 감각은 색·모션·타이포로, 가독성은 대비로.

## 3. Typography

**언어별 폰트 규칙(핵심):** 본문·일반 UI 텍스트는 **Pretendard**만 사용한다. 한글 **display** 문구는 **Nanum Myeongjo**, 영문/라틴 **display** 단어(예: "Vision", "Vibe")는 **Instrument Serif** 악센트를 사용한다. 세리프는 display 계층에서만 쓰며, 본문에는 섞지 않는다.

- `--font-body`: `"Pretendard"` — 본문/UI 전용. 사용 굵기는 500·600·700으로 제한한다.
- `--font-display-kr`: `"Nanum Myeongjo"` — 한글 display 전용.
- `--font-display-en`: `"Instrument Serif"` — 영문 display 전용.

### Hierarchy `[globals.css 토큰 = 실제 값]`

CSS 커스텀 프로퍼티는 `font` shorthand(`weight size/line-height family`)로 정의되며, Tailwind 유틸리티 클래스로 노출된다(`text-display-xl`, `text-heading-md`, `text-body-md`, `text-label` …).

- **Display (KR, Nanum Myeongjo):** `text-display-xl` 700·84px … `text-display-sm` 700·32px. 결과 공개·히어로 순간. tracking `-0.02em`.
- **Display (EN, Instrument Serif):** `text-display-en-xl` italic·88px … `text-display-en-sm` italic·34px. 영문 단어 전용.
- **Heading:** `text-heading-lg` 700·28px, `text-heading-md` 600·22px. 섹션·질문 제목.
- **Body:** `text-body-lg` 500·18px, `text-body-md` 500·16px(본문 기본), `text-body-sm` 500·14px.
- **Label / Caption:** `text-label` 600·13px(버튼·칩·메타), `text-caption` 500·12px.

### Named Rules

**The One-Kicker Rule.** 모든 섹션 위에 소문자 트래킹 eyebrow나 `01 / 02 / 03` 번호를 습관적으로 붙이지 않는다. AI 문법의 대표 신호다. (Badge 의 uppercase 라벨은 의도적 강조에만 절제해 쓴다.)

## 4. Spacing, Radius & Elevation

**Spacing:** 4px base 스케일 — `--space-1`(4px) … `--space-20`(80px). Tailwind 기본 스케일과 정렬.

**Radius:** `--radius-sm`(8px) · `--radius-md`(14px) · `--radius-lg`(20px) · `--radius-xl`(28px) · `--radius-pill`(999px). 카드는 부드럽게 둥글게(`lg`), **CTA 버튼은 완전 캡슐(`pill`)** — 시스템의 유일한 기본 버튼 형태.

**Elevation — 색조 그림자 전략:** 깊이는 전부 색조 그림자로 표현한다(순수 검정/opacity 금지).

- `--shadow-card` / `--shadow-card-hover`: 중립 카드 그림자(웜 로즈-그레이 틴트)
- `--shadow-ink` / `--shadow-{pink|violet|cyan|green|mustard}` + `*-hover` / `*-press`: 버튼·강조 요소의 tone별 색조 그림자. rest → hover(더 크게 떠오름) → press(납작하게 눌림) 3단계.

## 5. Motion

- 커브: `--ease-standard` `cubic-bezier(0.4,0,0.2,1)`, `--ease-spring` `cubic-bezier(0.34,1.56,0.64,1)`(lift/press 스프링)
- 지속: `--duration-fast` 120ms · `--duration-base` 200ms · `--duration-slow` 360ms
- **Lift-on-hover / Press-down 패턴:** 인터랙티브 표면은 hover 시 `translateY(-3px)` + 그림자 확대, press 시 `translateY(1px) scale(0.97)` + 그림자 축소. 재색상만이 아니라 "떠오르고 눌리는" 물리감으로 반응한다.
- 모든 애니메이션에 `prefers-reduced-motion` 대안을 둔다.

## 6. Components

시각 토큰을 구현한 shadcn/ui 컴포넌트 킷은 [`src/components/ui/`](./src/components/ui)에 있다. 신규 UI 는 이 킷을 우선 재사용한다.

| 컴포넌트   | 시그니처                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`   | Pill 형태, `tone`(ink·pink·violet·cyan·green·mustard) × `variant`(primary·secondary·ghost) × `size`(sm·md·lg + icon-*). 그라디언트 fill + 색조 그림자 + 스프링 lift/press. |
| `Card`     | 웜화이트 카드 + 색조 그림자(테두리 없음), `tone` 옵션. Header/Title/Description/Content/Footer 조합.                                                                       |
| `Dialog`   | radix 기반 확인 모달. 모바일 하단 시트 / sm↑ 가운데 카드. 열림·닫힘 200ms 애니메이션, 포커스 트랩, Escape. `DialogContent`(title·description) + `DialogActions`.           |
| `Badge`    | soft 그라디언트 pill, uppercase `text-label`.                                                                                                                              |
| `Input`    | 테두리 없는 sunken fill, focus 시 아웃라인 대신 색조 그림자 + lift.                                                                                                        |
| `Progress` | 색조 트랙 + 그라디언트 fill(글로우), radix 기반 접근성.                                                                                                                    |
| `Avatar`   | 원형 + 색조 링 그림자, radix 이미지/폴백.                                                                                                                                  |

**주목할 시그니처 컴포넌트(제품 고유):** 테스트 문항 카드, 실시간으로 채워지는 생성 미리보기, Konva 무드보드 캔버스 + 스티커/텍스트 컨트롤, 공유/내보내기 CTA.

## 7. Brand Wordmark

텍스트 마크(로고 파일 없음): `mood` 는 `--text-primary`(잉크), `me` 는 `--violet-500`, 둘 다 `--font-body` 700 weight. 예: **mood**<span style="color:#8b5cf6">me</span>.

## 8. Do's and Don'ts

### Do:

- **Do** 무드보드(결과물)를 화면의 히어로로 두고, UI 크롬은 물러서게 한다.
- **Do** 악센트 표면은 `--gradient-*` 글로우 그라디언트로 채운다.
- **Do** 깊이는 색조 그림자로 표현하고, hover/press 에 물리적 lift/press 모션을 준다.
- **Do** 로딩·생성 상태를 "채워지는 설렘"으로 연출한다(실시간 미리보기, 단계별 리듬).
- **Do** 본문 대비 ≥4.5:1을 지키고, 색만이 아니라 아이콘·밑줄·텍스트로 상태를 구분한다.
- **Do** 본문/UI는 Pretendard, 한글 display는 Nanum Myeongjo, 영문 display는 Instrument Serif로 구분한다.
- **Do** 시맨틱 HTML(`a` vs `button`), 의미 있는 `alt`, `prefers-reduced-motion` 대안을 둔다.

### Don't:

- **Don't** 악센트 표면을 flat 단색으로 채운다(그라디언트 규칙 위반).
- **Don't** `background-clip:text` 그라디언트 텍스트나 장식용 글래스모피즘을 쓴다.
- **Don't** 순수 검정/opacity 그림자를 쓴다(색조 그림자만).
- **Don't** 전형적 SaaS 대시보드처럼 차갑고 기능 위주의 밀도/레이아웃을 만든다.
- **Don't** 유치한 클립아트·이모지로 친근함을 대체한다.
- **Don't** 모든 섹션 위에 대문자 eyebrow나 `01/02/03` 번호를 습관적으로 붙인다.
- **Don't** 본문에 display 세리프를 섞거나, 한글 display에 Instrument Serif를 적용한다.
- **Don't** 몽환적 무드를 핑계로 흐린 저대비 텍스트를 쓴다.
