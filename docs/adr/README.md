# ADR (Architecture Decision Records)

기술 결정을 **왜 그렇게 했는지**와 함께 기록합니다. 나중에 "이거 왜 이렇게 돼 있지?"에 답하는 문서입니다.

## 규칙

- 되돌리기 비싼 결정(라이브러리 선택, 구조 결정, 정책)이 내려지면 ADR을 추가합니다.
- 파일명: `NNN-주제.md` (3자리 연번, kebab-case).
- 결정을 뒤집을 때는 기존 ADR을 지우지 않고 상태를 `superseded by NNN`으로 바꾼 뒤 새 ADR을 씁니다.

## 목록

| #                                        | 제목                                                               | 상태                                               |
| ---------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| [001](./001-canvas-konva.md)             | 캔버스 라이브러리 — Konva/react-konva                              | ✅ 채택                                            |
| [002](./002-ai-claude-haiku-fal-flux.md) | AI — Claude Haiku(텍스트) + fal.ai Flux schnell(이미지)            | superseded by [004](./004-ai-elice-gpt5-gemini.md) |
| [003](./003-state-library-deferred.md)   | 상태 라이브러리 — 도입 보류 (도입 신호 정의)                       | ✅ 채택                                            |
| [004](./004-ai-elice-gpt5-gemini.md)     | AI — Elice AX 프록시(GPT-5 텍스트 + GPT-Image-2 이미지)            | ✅ 채택                                            |

## 템플릿

```markdown
# NNN. 제목

- 상태: 채택 | superseded by NNN
- 날짜: YYYY-MM-DD

## 맥락

어떤 문제/제약 속에서 결정했나

## 결정

무엇을 하기로 했나 (한 문장)

## 근거

왜 이것인가 — 비교한 대안과 탈락 이유

## 결과

이 결정이 코드/작업 방식에 미치는 영향, 관련 컨벤션 링크
```
