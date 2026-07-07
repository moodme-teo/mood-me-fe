# impeccable 사용 가이드 (팀원용)

> mood-me는 **impeccable**로 AI와 함께 프론트엔드를 개발합니다. 이 문서 하나로 시작할 수 있어요.
> 세팅 배경/결정이 궁금하면 → [의사결정 기록](./decisions/impeccable-setup.md)

---

## impeccable이 뭐야?

AI 코딩 에이전트(**Claude Code / Codex**)가 **더 나은 UI를 만들도록 돕는 디자인 스킬**이에요.

- `/impeccable <명령>` 형태로 디자인 작업을 시킬 수 있고,
- UI 파일을 편집하면 **자동으로 디자인 검사(detector)**가 돌아 AI 슬롭·접근성 문제 등을 잡아줍니다.
- 우리 팀의 디자인 기준([`PRODUCT.md`](../PRODUCT.md) · [`DESIGN.md`](../DESIGN.md))을 항상 참고해서, **누가 만들어도 같은 브랜드 룩으로 수렴**합니다.

---

## 1. 최초 1회 세팅 (각자)

레포를 clone한 뒤, 자기 컴퓨터에 엔진을 한 번만 설치하면 됩니다.

```bash
npx impeccable install     # Claude Code / Codex 자동 감지해서 설치
```

- 우리 팀 디자인 기준(`PRODUCT.md` / `DESIGN.md`)은 **이미 레포에 있어요.** 따로 만들 필요 없이 자동으로 읽힙니다.
- 설치하면 UI 파일 편집 시 자동 검사 hook도 같이 켜집니다.

> 💡 설치 안 하면 `/impeccable` 명령과 자동 검사가 안 돕니다. clone 후 꼭 1회 실행하세요.

---

## 2. 기본 사용법

```
/impeccable <명령> [대상]
```

- **대상**은 파일·컴포넌트·화면을 자연어로 지정해요. 예: `/impeccable polish 온보딩 화면`
- 명령 없이 그냥 `/impeccable`만 치면 → 지금 상황에 맞는 **추천 명령**을 알려줍니다.

---

## 3. 자주 쓰는 명령 (이것만 알아도 충분)

| 명령           | 언제 쓰나                                     | 예시                                   |
| -------------- | --------------------------------------------- | -------------------------------------- |
| **`craft`**    | 새 기능/화면을 **기획+구현 한 번에**          | `/impeccable craft 결과 공유 화면`     |
| **`shape`**    | 코드 짜기 전에 **UX/UI 먼저 설계**            | `/impeccable shape 테스트 문항 플로우` |
| **`critique`** | 만든 화면의 **UX 리뷰(점수 포함)**            | `/impeccable critique 무드보드 캔버스` |
| **`audit`**    | **접근성·성능·반응형** 기술 점검              | `/impeccable audit 결과 화면`          |
| **`polish`**   | 배포 전 **마감 다듬기**                       | `/impeccable polish 공유 CTA`          |
| **`live`**     | 브라우저에서 요소 골라 **변형안 실시간 생성** | `/impeccable live`                     |

> 이 외에도 `animate`, `colorize`, `typeset`, `layout`, `clarify`, `harden` 등 총 23개 명령이 있어요. 전체 목록은 그냥 `/impeccable` 입력.

**추천 흐름:** 새 화면은 `shape → craft`, 다 만든 화면은 `critique → polish`, 배포 전 `audit`.

---

## 4. 자동 디자인 검사 (hook)

UI 파일을 편집하면 impeccable이 자동으로 검사해서 문제를 짚어줘요 (그라디언트 남발, 저대비 텍스트, side-stripe border 같은 AI 슬롭 등). **명령을 안 쳐도** 백그라운드로 돕니다.

---

## 5. 공유 컨텍스트 건드릴 때 규칙 ⚠️

`PRODUCT.md`(전략) · `DESIGN.md`(시각 시스템)는 **팀 공용 기준 문서**예요.

- **마음대로 고치지 않기.** 방향을 바꾸고 싶으면 **PR로 제안 → 리뷰 → 머지**.
- 특히 `DESIGN.md`의 색·폰트·모션(`[담당자 결정]` 표시)은 **UX/UI 담당자**가 확정합니다.
- 개인 취향으로 로컬에서 임의 수정 후 커밋 ❌.

---

## 6. FAQ

**Q. Cursor 써도 돼?**
현재 팀 표준은 Claude Code / Codex예요. Cursor 설정은 세팅에서 제외했습니다.

**Q. 내 hook 설정 파일이 git에 안 잡히는데?**
정상이에요. `.claude/settings.local.json` · `.codex/hooks.json`은 **각자 경로가 달라서** `.gitignore` 처리했어요. `npx impeccable install`이 알아서 만들어줍니다.

**Q. 디자인 기준을 바꾸고 싶어.**
`PRODUCT.md` / `DESIGN.md`를 수정하는 PR을 올리세요. 일반 코드처럼 리뷰로 관리합니다.
