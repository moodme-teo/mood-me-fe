# 용어사전 (Glossary)

팀원 전원이 같은 개념에 같은 단어를 쓰기 위한 문서입니다. **같은 개념에 새 이름을 만들지 않습니다.** 새 도메인 개념이 생기면 여기에 먼저 등록한 뒤 코드에 씁니다. 코드 식별자는 PRD §7 데이터 모델과 일치해야 합니다.

| 용어 (한국어)     | 코드 식별자                    | 의미                                                                           |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| 추구미            | mood / aesthetic               | 사용자가 지향하는 무드·미감. 제품의 핵심 개념                                  |
| 추구미 테스트     | `MoodTest`                     | 답변을 수집하는 3막 구성의 테스트                                              |
| 테스트 세션       | `MoodTestSession`              | 한 사용자의 테스트 진행 단위 (`in_progress \| completed`)                      |
| 답변              | `MoodTestAnswer`               | 문항 하나에 대한 응답 (`image \| keyword \| image_keyword`)                    |
| 생성 작업         | `MoodboardGenerationJob`       | AI 생성 파이프라인의 작업 단위 (`queued \| processing \| completed \| failed`) |
| 무드보드          | `Moodboard`                    | 최종 결과물. base image + elements + mood profile                              |
| 베이스 이미지     | `baseImage` / `base_image_url` | fal.ai가 생성한 무드보드의 바탕 이미지                                         |
| 보드 요소         | `MoodboardElement`             | 캔버스 위에 얹는 요소 (`pen \| sticker \| text`)                               |
| 스티커            | `sticker`                      | 보드 요소 타입 중 하나 — 이미지 기반 장식                                      |
| 펜                | `pen`                          | 보드 요소 타입 중 하나 — 자유 드로잉                                           |
| 무드 프로파일     | `moodProfile` / `mood_profile` | 축(axis)별 수치로 표현한 무드 성향 (그래프 시각화의 원천)                      |
| 키워드            | `keyword`                      | Claude가 답변에서 추출한 무드 키워드 (9개)                                     |
| 프롬프트          | `prompt`                       | Claude/fal.ai에 보내는 생성 지시문 — `lib/prompts.ts`에서만 관리               |
| 생성              | `generation`                   | Claude(텍스트)와 fal.ai(이미지)를 거치는 AI 파이프라인 전체                    |
| 캔버스            | `canvas`                       | Konva 기반 편집 화면. `components/canvas/` 격리 구역                           |
| 스테이지 / 레이어 | `Stage` / `Layer`              | Konva 렌더 트리의 최상위/그룹 단위 — canvas.md 참고                            |
| 게스트 세션       | `GuestSession`                 | 비로그인 사용자의 임시 세션 (client-issued, 만료 있음)                         |
| 사용자            | `User`                         | 카카오 로그인 사용자                                                           |

## 표기 규칙

- 문서·커밋·이슈에서는 한국어 용어를, 코드에서는 코드 식별자를 씁니다.
- DB 컬럼은 snake_case(`base_image_url`), TS 코드는 camelCase(`baseImageUrl`) — 변환은 API 경계 한 곳에서.
- 페이지 이름은 라벨 체계를 따릅니다: 로그인 · 메인 · 테스트 · 보드생성 · 보드편집 · 보드완성 · 공통.
