# 무드보드 생성

> 📌 브랜치 `test/board-image-gpt` 전용 기록 문서.

## 개요

무드보드 이미지 생성에는 **Elice 프록시의 `gpt-image-2`(GPT-Image-2)** 를 쓴다.

> 📌 **`type_name`은 쓰지 않는다 ** 보드 프롬프트에는 **페르소나 비율 블록만** 넘긴다. AI가 여정을 읽고 페르소나 두 개를 골라 문자열을 뱉는 구조도 쓰지 않는다 — **GPT-5는 페르소나 판정 주체가 아니다.**
>
> 페르소나 판정은 `src/lib/mood-test/persona.ts`의 `computePersonaResult`(결정론적 순수 함수)가 맡는다.

## API 사용법 (gpt-image-2)

OpenAI 호환 API. 클라이언트/응답 처리는 표준 OpenAI images 형식과 동일.

- **base_url**: `https://api-cloud-function.elice.io/v1` (= `ELICE_BASE_URL`, [ADR 004](../../../adr/004-ai-elice-gpt5-gemini.md))
- **엔드포인트**: `POST /v1/images/generations` · 편집 `POST /v1/images/edits`
- **model**: `openai/gpt-image-2` — 코드에서는 `lib/elice-ai.ts`의 `GPT_IMAGE_MODEL` 상수로만 참조
- **auth**: `Authorization: Bearer <api_key>` — `ELICE_MODEL_API_KEY`
- **응답**: base64 인코딩 이미지 `data[0].b64_json`
- **파라미터**:
  - `size` — **자유 해상도**: 가로·세로 각 **16의 배수**, 최대 변 3840px(4K), **종횡비 3:1 이내**. 요청값이 그대로 반환 해상도가 된다 (`768x1024`·`1024x768`·`1024x1536`·`1536x1024`·`1152x2048` 실측 확인). 세로형도 크롭·패딩 없이 네이티브 생성
  - `quality` — `low` / `medium` / `high` / `auto`(기본)
  - `output_format` — `png`(기본) / `jpeg` / `webp`. jpeg·webp는 `output_compression`(0–100)으로 압축률 조절
  - `n` — 생성 장수
  - 입력 이미지는 항상 고충실도(high fidelity) 자동 처리
- **호출 규칙 — 반드시 지킬 것** (2026-07-09 실측):
  - **`response_format`을 보내지 않는다** — 400 `Unknown parameter: 'response_format'`. `b64_json`이 기본 응답이다
  - **`size`를 항상 명시한다** — 생략하면 `1402x1122` 같은 비정형 해상도가 나온다
  - **`quality=high`는 일부 size에서 503 `backend_error`를 낸다** — `1024x1024`(3/3 재현)와 **`1024x1536`(보드 크기)** 둘 다 실패. 같은 quality라도 `1024x768`·`1536x1024`는 정상이라 size 의존이 맞지만 규칙은 아직 못 찾았다. **보드는 `quality=medium`으로 고정**하고, `high`가 필요하면 해당 size를 먼저 찔러본다
  - **이 503은 gpt-image-2 고유 문제다** — 같은 엔드포인트·같은 `1024x1536`+`high`라도 `gpt-image-1.5`는 200이고 46초로 오히려 빠르다 (§비용)
  - **지연시간을 감안해 타임아웃을 잡는다** — `1024x768` 기준 `high` ≈ 118초 · `medium` ≈ 40초 · quality 미지정 ≈ 18초. **`1024x1536` + `medium` ≈ 65~70초** (보드 실측)
  - **응답의 `usage`를 로깅한다** — `usage.input_tokens` / `output_tokens`가 그대로 온다. 크레딧은 토큰당 과금이므로 추정하지 말고 이 값을 쓴다 (§비용)
  - Cloudflare 뒤라 브라우저 `User-Agent` 헤더를 붙인다
- **한계**:
  - **투명 배경 미지원** (배경은 불투명 또는 `auto`만) → 오브제 컷아웃은 후처리(Pillow flood-fill 등) 필요
  - 이미지 variations 엔드포인트 미지원
  - 길거나 복잡한 텍스트의 이미지 내 렌더링 취약 (무드미는 텍스트 배제 방침이라 영향 적음)
  - 복잡한 다중 객체 간 공간 관계 부정확 가능

## 비율 매핑 (수집 대장 요구 믹스 → size)

`size`가 실제 해상도로 반영되므로 크롭 없이 원본 비율로 생성한다. 16배수·3:1 이내 제약 하:

| 비율                | size (16배수) |
| ------------------- | ------------- |
| 정방 1:1            | `1024x1024`   |
| 세로 3:4            | `768x1024`    |
| 가로 4:3            | `1024x768`    |
| **세로 2:3 (보드)** | `1024x1536`   |

- **비전보드 출력은 세로 2:3(`1024x1536`) + `quality=medium` 고정.** 9:16(`1152x2048`)도 API로 생성 가능하지만 쓰지 않는다. `quality=high`는 이 size에서 503이 난다 (§API 사용법).

## env

`.env.local` (git 무시):

```
ELICE_BASE_URL=https://api-cloud-function.elice.io/v1
ELICE_IMAGE_MODEL=openai/gpt-image-2
ELICE_MODEL_API_KEY=<Elice 프록시 키>
```

- Cloudflare 뒤라 브라우저 UA 헤더를 붙였다 (요청 헤더 `User-Agent`).

## 비용 (크레딧)

Elice 단가 — **입력 ₩12,852 / 1M tokens · 출력 ₩48,195 / 1M tokens**. 보유 크레딧 **50만** (1크레딧 = ₩1 가정).

**출력 토큰은 프롬프트 길이와 무관하게 `size` · `quality`로 고정된다.** 응답 `usage`로 실측한 값 (`1024x1536`):

| quality  | 출력 토큰 | 내역                      |
| -------- | --------- | ------------------------- |
| `medium` | 1,372     | 이미지 1,372              |
| `high`   | 6,565     | 이미지 6,240 + 텍스트 325 |

**보드 1장 원가** (한글 프롬프트 ≈ 1,902 입력 토큰 기준):

| 조합                | 입력  | 출력   | 장당 원가 | 50만 크레딧으로 |
| ------------------- | ----- | ------ | --------- | --------------- |
| **`medium` (기본)** | ₩24.4 | ₩66.1  | **₩90.6** | 약 5,500장      |
| `high`              | ₩24.4 | ₩316.4 | ₩340.8    | 약 1,460장      |

- 실패 응답(400·503)은 이미지가 없어 **출력 과금이 없다**.

### 모델 × 품질 조합 — 프롬프트 확정 후 테스트할 것

프롬프트는 계속 갱신 중이므로, **프롬프트가 고정되면** 아래 3조합을 같은 프롬프트로 돌려 **총 크레딧(입력+출력)과 소요 시간**을 비교한다. 비교 후 기본 조합을 재검토한다.

| #   | 조합                       | 상태                                 |
| --- | -------------------------- | ------------------------------------ |
| 1   | `gpt-image-1.5` + `medium` | 미측정                               |
| 2   | `gpt-image-1.5` + `high`   | 미측정 (출력 6,565 · 46초는 확인)    |
| 3   | `gpt-image-2` + `medium`   | 미측정 (출력 1,372 · 65~70초는 확인) |

- **`gpt-image-2` + `high`는 후보에서 제외** — `1024x1536`에서 503 `backend_error` (§API 사용법). 같은 size·quality라도 **`gpt-image-1.5`는 정상이고 46초로 오히려 빠르다.**
- 비교 항목: 총 크레딧 · 소요 시간 · **결과물 품질**(비율 반영 정확도, 꼬리 페르소나 보존, 텍스트 렌더).

> **현재 기본값: `gpt-image-2` + `quality=medium` + `1024x1536`.** 위 비교 전까지 이 조합을 쓴다.

## 적용할 코드 변경 (Gemini → gpt-image-2)

이 브랜치는 테스트 전용이라 코드를 커밋하지 않는다. 아래는 **본 작업 브랜치에서 적용해야 할 변경 전문**이다 — `test/board-image-gpt`에서 실제로 돌려본 코드를 그대로 옮겨 적었다. 모델 상수만 바꾸면 런타임에 깨진다(`response_format` 400, 타임아웃 30초 초과) — 파일 2개를 반드시 함께 적용할 것.

**변경 대상 5파일 + env 1줄** (`docs/work/todo/*`와 `src/lib/mood-test/persona.ts`는 이 목록에서 제외 — 별도 작업으로 이미 반영됨)

| #   | 파일                                       | 성격 |
| --- | ------------------------------------------ | ---- |
| ①   | `src/lib/elice-ai.ts`                      | 코드 |
| ②   | `src/lib/moodboard/generate-hero-image.ts` | 코드 |
| ③   | `docs/convention/ai.md`                    | 문서 |
| ④   | `docs/adr/004-ai-elice-gpt5-gemini.md`     | 문서 |
| ⑤   | `docs/adr/README.md`                       | 문서 |
| ⑥   | `.env.local` (git 무시)                    | env  |

---

### ① `src/lib/elice-ai.ts`

`GEMINI_IMAGE_MODEL` 상수 하나를 `GPT_IMAGE_MODEL`로 교체한다. 파일의 나머지(지연 클라이언트 생성, `GPT_MODEL`)는 그대로.

```diff
 // 여정 → 무드 프로파일 변환용.
 export const GPT_MODEL = "openai/gpt-5";

-// 보드 히어로 컷 생성용 (#37). 실측 스펙: docs/work/todo/moodboard-library-collection.md
-// — aspect_ratio 파라미터는 무시되고 항상 1024×1024로 반환된다.
-export const GEMINI_IMAGE_MODEL = "google/gemini-2.5-flash-image";
+// 보드 히어로 컷 생성용 (#37). 실측 스펙: docs/work/todo/moodboard/moodboard-creation.md
+// — size는 요청값 그대로 반환되고, response_format은 지원하지 않는다.
+export const GPT_IMAGE_MODEL = "openai/gpt-image-2";
```

- 상수명이 바뀌므로 **import하는 쪽(②)을 같은 커밋에서 고쳐야 타입체크가 통과**한다. `GEMINI_IMAGE_MODEL` 참조처는 ② 한 곳뿐이다 (`git grep GEMINI_IMAGE_MODEL`로 확인).

### ② `src/lib/moodboard/generate-hero-image.ts`

**변경 후 파일 전문** (이 파일은 짧으니 통째로 갈아끼우는 게 안전하다):

```ts
import "server-only";

import { getEliceClient, GPT_IMAGE_MODEL } from "@/lib/elice-ai";

// quality=medium 기준 실측 ~40초. high는 ~120초라 재시도까지 감안하면 예산을 넘는다.
const IMAGE_TIMEOUT_MS = 90_000;
const IMAGE_SIZE = "1024x1024";

// moodboard-creation.md 실측 주의사항:
// ① urllib 기본 UA는 Cloudflare 1010 차단 → 브라우저 UA 헤더 필요
// ② size=1024x1024 + quality=high 조합은 프록시가 503(backend_error)을 낸다 → medium 고정
// ③ 간헐적 5xx(빈 응답) → 1회 재시도
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function callImageModel(prompt: string): Promise<string> {
  const response = await getEliceClient().images.generate(
    {
      model: GPT_IMAGE_MODEL,
      prompt,
      size: IMAGE_SIZE,
      quality: "medium",
    },
    {
      timeout: IMAGE_TIMEOUT_MS,
      headers: { "User-Agent": BROWSER_USER_AGENT },
    },
  );

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("이미지 생성 응답에 b64_json이 없습니다");
  }
  return `data:image/png;base64,${b64}`;
}

// 히어로 컷 1장을 생성해 data URL로 반환한다. 실패 시 1회 재시도(moodboard-creation.md
// "간헐적 5xx → 재시도" 실측 근거) — 그래도 실패하면 호출부가 job을 failed로 처리한다.
export async function generateHeroImage(prompt: string): Promise<string> {
  try {
    return await callImageModel(prompt);
  } catch {
    return await callImageModel(prompt);
  }
}
```

변경점을 낱개로 세면:

1. **`response_format: "b64_json"` 삭제** — gpt-image-2는 400 `Unknown parameter: 'response_format'`. b64_json이 기본 응답이라 지우기만 하면 된다 (§API 사용법).
2. **`IMAGE_TIMEOUT_MS` 30_000 → 90_000** — medium 실측 40초. 30초로는 정상 응답도 못 받는다.
3. **`IMAGE_SIZE = "1024x1024"` 상수 신설 + `size` 명시** — 생략하면 `1402x1122` 같은 비정형 해상도가 나온다.
4. **`quality: "medium"` 명시.**
5. **함수명 `callGemini` → `callImageModel`** (호출부 2곳 포함), import를 `GPT_IMAGE_MODEL`로.
6. **주석 3줄 갱신** — "aspect_ratio 무시, 항상 1024×1024"(Gemini 한정)를 "size=1024x1024+high는 503" 로, "간헐적 500(NoneType parts)"를 "간헐적 5xx(빈 응답)"으로. 문서 링크 3곳도 `moodboard-creation.md`로.

- **히어로 컷 `size`는 `1024x1024`** — 보드 출력 비율(2:3)과 무관하다. 히어로는 보드 안 타일이고, `layout-central-title-radial.ts`가 슬롯을 `height = width * 1.15`로 그리므로 정방에 가깝다. §3의 `MOODBOARD_IMAGE_SIZE = "1024x1536"`은 **보드 전체 출력용**이라 다른 값이다 — 헷갈리지 말 것.
- `quality`는 `medium` 고정 — `high`는 118초라 재시도(1회)까지 감안하면 예산을 넘고, `1024x1024`와 조합 시 503이 난다 (§API 사용법).

### ③ `docs/convention/ai.md` — §Model 선택

```diff
   - 텍스트: `lib/elice-ai.ts`의 `GPT_MODEL` (`openai/gpt-5` — 여정 → 무드 프로파일 변환용)
-  - 이미지: `lib/elice-ai.ts`의 이미지 모델 상수 (`google/gemini-2.5-flash-image`) — #37에서 추가
+  - 이미지: `lib/elice-ai.ts`의 `GPT_IMAGE_MODEL` (`openai/gpt-image-2` — 보드 히어로 컷 생성용)
```

### ④ `docs/adr/004-ai-elice-gpt5-gemini.md`

**파일명은 그대로 둔다** — 5곳에서 링크 중이라 rename하면 전부 깨진다. 대신 상단에 "파일명은 링크 호환 유지" 한 줄을 박는다. ADR 004는 이미 `dev`에 머지된 채택 문서이므로 **원 결정을 지우지 말고 §개정으로 쌓는다** — "Gemini를 골랐다가 왜 바꿨는지"가 ADR의 값어치다.

```diff
-# 004. AI — Elice AX 프록시(GPT-5 텍스트 + Gemini 2.5 Flash Image 이미지)
+# 004. AI — Elice AX 프록시(GPT-5 텍스트 + GPT-Image-2 이미지)

 - 상태: 채택
-- 날짜: 2026-07-08
+- 날짜: 2026-07-08 (개정 2026-07-09 — 이미지 모델 Gemini 2.5 Flash Image → GPT-Image-2)
 - 이전: supersedes [002](./002-ai-claude-haiku-fal-flux.md)

+> 파일명(`...-gemini.md`)은 링크 호환을 위해 유지한다. 이미지 모델은 아래 §개정 참조.
+
 ## 맥락
```

§결정:

```diff
-- 이미지 생성: **Elice AX 프록시의 Gemini 2.5 Flash Image** (`google/gemini-2.5-flash-image`, OpenAI 호환 `/images/generations`) — 상세: [moodboard-library-collection.md](../work/todo/moodboard-library-collection.md)
+- 이미지 생성: **Elice AX 프록시의 GPT-Image-2** (`openai/gpt-image-2`, OpenAI 호환 `/images/generations`) — 상세: [moodboard-creation.md](../work/todo/moodboard/moodboard-creation.md)
+  - 최초 채택(2026-07-08)은 Gemini 2.5 Flash Image였다. 아래 §개정 참조
```

§결과:

```diff
-- 모델명·엔드포인트는 `lib/elice-ai.ts`(`GPT_MODEL`) 상수로만 참조 — 교체는 한 곳 수정
+- 모델명·엔드포인트는 `lib/elice-ai.ts`(`GPT_MODEL`·`GPT_IMAGE_MODEL`) 상수로만 참조 — 교체는 한 곳 수정
 - 키는 서버 전용(`server-only` 강제), 호출 규칙·재시도·폴백은 [convention/ai.md](../convention/ai.md)
-- `lib/anthropic.ts`(Claude)·`lib/fal.ts`(fal.ai)·`@anthropic-ai/sdk`·`@fal-ai/client`는 이 결정으로 제거한다. 이미지 모델 상수(`google/gemini-2.5-flash-image`)는 이미지 생성(#37) 구현 시점에 `lib/elice-ai.ts`에 추가된다
+- `lib/anthropic.ts`(Claude)·`lib/fal.ts`(fal.ai)·`@anthropic-ai/sdk`·`@fal-ai/client`는 이 결정으로 제거한다
```

파일 끝에 **§개정 절 신설** (전문):

```md
## 개정 — 이미지 모델 Gemini → GPT-Image-2 (2026-07-09)

이미지 생성 모델만 **`google/gemini-2.5-flash-image` → `openai/gpt-image-2`** 로 교체한다. 텍스트 모델·프록시·인증 체계는 그대로다.

**근거** (실측: [moodboard-creation.md](../work/todo/moodboard/moodboard-creation.md))

- Gemini는 `aspect_ratio`를 무시하고 항상 1024×1024 정방으로만 반환해 **보드 출력 비율(세로 2:3)을 만들 수 없었다.** gpt-image-2는 `size` 요청값을 그대로 반영한다 (16배수·최대 4K·종횡비 3:1 이내)
- 같은 프록시(`https://api-cloud-function.elice.io/v1`)·같은 키로 접근하므로 004의 통일 근거를 해치지 않는다

**따라오는 코드 변경** — 모델 상수만 바꾸면 런타임에 깨진다

- `GEMINI_IMAGE_MODEL` → `GPT_IMAGE_MODEL = "openai/gpt-image-2"` (`lib/elice-ai.ts`)
- `generate-hero-image.ts`: `response_format: "b64_json"` **제거**(gpt-image-2는 400 `Unknown parameter`, b64_json이 기본 응답) · 타임아웃 30초 → **90초**(medium 실측 40초) · `size`·`quality` 명시

**알려진 제약**

- `size=1024x1024` + `quality=high` 조합은 프록시가 503 `backend_error`를 낸다 (재현 3/3). `quality: "medium"` 으로 우회 중이며 Elice에 문의 대상
- 지연시간: `high` ≈ 118초 / `medium` ≈ 40초 — 타임아웃·재시도 예산을 이 폭에 맞춘다
```

### ⑤ `docs/adr/README.md` — 인덱스 004행

```diff
-| [004](./004-ai-elice-gpt5-gemini.md)     | AI — Elice AX 프록시(GPT-5 텍스트 + Gemini 2.5 Flash Image 이미지) | ✅ 채택                                            |
+| [004](./004-ai-elice-gpt5-gemini.md)     | AI — Elice AX 프록시(GPT-5 텍스트 + GPT-Image-2 이미지)            | ✅ 채택                                            |
```

- 002행의 `superseded by [004]` 링크는 파일명을 유지하므로 **손대지 않는다.**

### ⑥ `.env.local` (git 무시)

```
ELICE_IMAGE_MODEL=openai/gpt-image-2
```

- ⚠️ **`ELICE_IMAGE_MODEL`은 현재 코드가 읽지 않는다.** `elice-ai.ts`가 `process.env`에서 읽는 건 `ELICE_MODEL_API_KEY`·`ELICE_BASE_URL` 둘뿐이고, 모델명은 `GPT_IMAGE_MODEL` 리터럴 상수다(컨벤션 §Model 선택: "모델 교체는 상수 한 곳 수정"). 이 env는 **문서·수동 테스트 스크립트용**이지 런타임 스위치가 아니다. env를 바꿨는데 모델이 안 바뀐다고 헤매지 말 것.
- `ELICE_BASE_URL`은 그대로.

---

### 빌더가 반드시 확인할 것 (테스트 브랜치의 미해결 흠)

이 브랜치 코드를 **그대로 복사하면 안 되는 지점들**이다. 옮기면서 같이 고칠 것.

1. **`moodboard-create.md`는 더 이상 없다.** 이 브랜치에서 `moodboard-create.md`가 `moodboard-creation.md`로 갈라지면서 삭제됐는데, 테스트 브랜치의 코드·ADR 주석은 아직 옛 이름을 가리킨다(`elice-ai.ts:24`, `generate-hero-image.ts:9,37`, ADR 004 §결정·§개정). **위 ①②④ 본문에는 이미 `moodboard-creation.md`로 고쳐 적어뒀다** — 그대로 쓰면 된다.
2. **`persona.ts:2`의 주석 링크도 깨져 있다** — `moodboard-create.md "페르소나 산출" 절`을 가리키는데, 그 내용은 지금 [moodboard-persona-ratio.md](./moodboard-persona-ratio.md)에 있다. persona.ts는 이번 revert 대상이 아니라 **살아남는 파일**이므로 빌더가 링크만 따로 고쳐야 한다.
3. **ADR 004 §개정의 "§테스트 로그 1" 앵커를 지웠다** — 이 문서에는 `테스트 로그` 헤딩이 없다. 위 ④ 본문처럼 문서 전체를 가리키게 둘 것.
4. **`moodboard-library-collection.md:241`은 여전히 `google/gemini-2.5-flash-image`를 적고 있다.** 그건 *스톡 수집 대장*의 과거 실측 기록이라 그대로 두는 게 맞지만, "지금 쓰는 모델"로 오해되지 않도록 한 줄 주석(→ 보드 생성은 gpt-image-2, ADR 004 §개정)을 다는 걸 권한다.
5. **`usage` 로깅이 아직 없다** (§해야할 것). `generate-hero-image.ts`가 `response.usage.input_tokens`/`output_tokens`를 로깅하도록 추가하면 크레딧을 추정 대신 실측할 수 있다. 이번 이관에 끼워 넣을지는 판단 필요.
6. **보드 본생성 코드는 아직 없다.** ②는 **히어로 컷**(`1024x1024`) 경로일 뿐이고, §3이 확정한 보드 출력(`1024x1536` · `medium` · 2:3)을 실제로 호출하는 코드는 이 브랜치에 없다. 상수 3개(`MOODBOARD_IMAGE_SIZE`·`MOODBOARD_IMAGE_RATIO`·`MOODBOARD_IMAGE_QUALITY`)를 어디에 둘지는 빌더가 정한다.
7. **페르소나 이름과 사전 키가 1:1이 아니다 — 조립 코드에서 반드시 처리할 것.** `computePersonaResult`가 뱉는 이름(`persona.ts`의 `AESTHETIC_CORES`·`LIFE_THEMES`)과 [moodboard-persona-list.md](./moodboard-persona-list.md) 사전의 키가 20종 중 **9종에서 어긋난다** — 사전 쪽에 별칭 접미사가 붙어 있다(`클린 걸` → `클린 걸 · 댓 걸`, `테크 노어` → `테크 노어 미니멀`, `트래블러` → `트래블러 · 방랑` 등). 이름으로 사전을 직접 인덱싱하면 **키워드가 통째로 빠지거나 런타임에 터진다.** `키 === 이름 || 키.startsWith(이름)` 으로 찾아야 한다.
   - `맥시멀 글램`은 사전이 `맥시멀리스트 글램`이라 **접두사 매칭으로도 안 붙던 유일한 키**였다 → **2026-07-09에 사전 키를 `맥시멀 글램`으로 통일**했다(`seed.ts`·`persona.ts`·수집 대장이 전부 이 이름을 쓴다). 이제 나머지 8종은 접두사 매칭으로 전부 해결된다.
   - 사전을 `.ts`로 옮길 때 **키를 `AESTHETIC_CORES`/`LIFE_THEMES` 원소 타입으로 묶어** 이 어긋남이 다시는 런타임까지 못 가게 하는 게 낫다.

## 프롬프트 방침 (수집 대장 계승) — **스톡 보완·오브제 컷아웃 전용**

⚠️ **적용 범위**: 아래 방침은 라이브러리에 넣을 **개별 소재**(스톡 보완 컷, 오브제 컷아웃)를 생성할 때만 쓴다. **비전보드 생성에는 적용하지 않는다** — 보드는 정반대로 종이 질감·타이틀 텍스트·인물 사진을 요구한다. 보드 규칙은 §3 참조.

- 질감/필름그레인/빈티지 지시 금지 (slop 지름길)
- 텍스트·로고·워터마크 배제 (뒷모습·손·신체 일부·실루엣은 허용)
- 한 장면·한 사물
- 오브제 컷아웃: `단색 순백(#ffffff) 배경 생성 → 배경 제거 → 투명 PNG`

## 해야할 것

- [ ] `quality` 단계별 **결과물 품질** 차이 (토큰·속도는 실측 완료: §비용)
- [ ] `generate-hero-image.ts`에 `usage` 로깅 추가 — 크레딧 추정 대신 실측
- [ ] 실제 구현 코드에 반영해야함. ## 적용할 코드 변경에 정리해둠. 하지만 적어둔 그대로 변경하면 안되고 검토필요함.(정리해둔 대로 변경할지, 추가 및 삭제 및 변경 해야할 건 뭔지)
- [ ] 페르소나 사전을 `.ts`로 옮기고 **키를 페르소나 이름과 타입으로 묶기** — 지금은 20종 중 9종이 접두사로만 붙는다 (§빌더가 반드시 확인할 것 7)

## 보드 이미지 생성 흐름 (페르소나 → 이미지)

무드보드 이미지는 **3단계**로 만든다.

1. **페르소나별 느낌·이미지 키워드 주입** — 20 페르소나 각각에 "핵심 느낌 + 이미지 생성 키워드"를 사전으로 고정 (아래 §1 테이블).
2. **사용자 선택 여정 → 페르소나 비율** — `computePersonaResult(journey)`로 코어/테마 두 축의 비율을 뽑는다 (아래 §2 · [moodboard-persona-ratio.md](./moodboard-persona-ratio.md)).
3. **비율에 따라 무드보드 이미지 생성** — 두 축의 비율 분포 전체를 §1 사전과 이어붙이고, **여정 해시로 고른 레이아웃 1종**을 얹어 gpt-image-2 프롬프트를 조립 (아래 §3 · [moodboard-layout.md](./moodboard-layout.md), **템플릿 확정 2026-07-09**).

레이아웃만 비율에서 유도되지 않는다 — **여정을 직접 해시해 7종 중 하나를 고르고, 고른 `layout_id`를 저장한다.** 페르소나와 연동하지 않는 이유(동점 10.4%·같음 증폭·스타일 사장)는 [moodboard-layout.md](./moodboard-layout.md) §선택 방식에 있다.

### 1. 페르소나 사전 (느낌 · 이미지 키워드)

20종 = **미학 코어 14 (C)** + **인생 테마 6 (T)**. 코어는 비주얼, 테마는 태도. 3단계 프롬프트는 코어 키워드로 "룩"을, 테마 키워드로 "삶의 장면"을 잡는다.

**→ 사전 전문(340개 키워드)은 [moodboard-persona-list.md](./moodboard-persona-list.md) 에 있다.** 코어 각 20개 · 테마 각 10개로, §3의 예산과 같은 수라 상한에 걸리지 않는다.

### 2. 여정 → 페르소나 비율

입력은 사용자 선택 여정(`Journey`), 출력은 코어/테마 두 축의 `PersonaRank[]`(페르소나·점수·비율). 예: 코어 1등 `코스탈 40%` + 테마 1등 `코지 홈바디 89%`. — 프롬프트에는 비율 분포 전체가 들어간다.
**→ 산출 규칙 전문은 [moodboard-persona-ratio.md](./moodboard-persona-ratio.md) 에 있다.** 가중치 상수, 워크드 예시, 열린 문제(★만 고른 유저의 테마)까지 그 파일에 있다.

### 3. 비율 → 무드보드 프롬프트

`computePersonaResult` 결과를 §1 사전과 이어붙이고, 여정 해시로 고른 레이아웃 1종을 얹어 최종 프롬프트를 만든다. 치환자는 세 자리다.

**확정 (2026-07-09):**

- **상위 N개가 아니라 나온 비율 분포 전체를 반영** — 코어/테마 두 축의 `PersonaRank[]`를 통째로 넘긴다.
- **배분 방식 = 숫자 비율 + 밴드 규칙** — 페르소나별 비율을 숫자로 주고, "몇 %면 어떻게 그릴지" 변환표(40%+ / 20–39% / 10–19% / 5–9% / 1–4%)를 함께 준다.
  - ⚠️ **옛 확정("가중 서술" — `mostly A, a smaller flash of B, faint whispers of C…` 식 자연어)은 폐기.** 실측이 갈렸다: 가중 서술을 쓴 테스트 3에서는 꼬리 2%·1%가 그림에서 소거됐지만, 밴드 규칙을 쓴 테스트 4·5에서는 4%·6%가 리본·크리스탈 같은 마이크로 디테일로 살아남았다. **"1~4%는 마이크로 디테일로만, 메인 장면 금지"라는 명시적 하한이 소거를 막는다.**
- **두 축을 하나의 순위로 합치지 않는다** — 미학 코어 = **룩**(팔레트·패션·조명·질감), 인생 테마 = **삶의 장면**(습관·루틴·목표). 프롬프트에 이 분리를 명문화한다.
- **금지어 필터 없음** — §프롬프트 방침(질감·텍스트 금지)은 스톡 소재 전용이라 보드에 적용하지 않는다. 그 절 머리의 ⚠️ 적용 범위 참조. 키워드 그대로.
- **메인 팔레트 = 미학 코어 1위** — 비율과 무관하게 코어 1위가 전체 컬러 팔레트와 시각적 중심을 정한다. 밴드 규칙만 두면 **코어 1위가 40% 미만인 여정에서 팔레트 결정권자가 사라진다** (인디 슬리즈 34% · 소프트 그런지 34% 여정처럼 40%+ 밴드가 비는 경우). 밴드는 상대적 우선순위만 말할 뿐, 팔레트라는 절대적 역할을 40%+에만 매달아뒀던 게 원인이다.
  - **코어 1·2위가 동점이면 두 페르소나를 균등 융합해 팔레트를 만든다.** 1위를 배열 순서로 가르면 카드 순서만 바뀌어도 팔레트 주인이 뒤집힌다 (인디 슬리즈 34% · 소프트 그런지 34%). 두 페르소나의 결이 멀수록(예: 클린 걸 30% · 다크 아카데미아 30%) 보드 전체 색이 갈리므로, 동점은 순서로 가르지 않고 융합으로 처리한다.
- **페르소나 이름은 글자로 넣지 않는다** — 비율 표의 페르소나 이름·영문 표기를 메모나 라벨로 쓰지 못하게 막는다. 표를 프롬프트에 통째로 넘기다 보니 모델이 이름을 **텍스트 조각으로 베껴 쓴다**: Y2K 회차에서 `Lucky girl syndrome` 메모가 나왔다(러키걸 89%). 이름을 적는 순간 보드가 "이 사람은 러키걸입니다"라는 **설명문**이 되고, 이미지로 드러내야 할 것을 글자가 대신해버린다. 유형명을 프롬프트에서 뺀 것(§개요)과 같은 이유다.
- **레이아웃 = 세 번째 치환자로 분리** — 비율에만 맡기면 여정이 달라도 구조가 늘 같은 보드가 나온다. 레이아웃 7종을 사전으로 두고 `{LAYOUT_STYLE_BLOCK}`으로 주입하며, **레이아웃이 템플릿의 다른 모든 지시보다 우선한다** ([moodboard-layout.md](./moodboard-layout.md)). 조각 수·여백·타이틀 카드 유무·텍스트 개수는 레이아웃이 정하고 템플릿은 위임한다 — 옛 확정(`12~18개 조각` · `중앙 타이틀 카드` · `텍스트 3~6개`)은 템플릿에서 삭제했다.
- **출력 크기·품질** — 보드는 세로 2:3 + `medium` 고정. `high`는 이 size에서 503이 난다 (§API 사용법).

  ```ts
  const MOODBOARD_IMAGE_SIZE = "1024x1536";
  const MOODBOARD_IMAGE_RATIO = "2:3";
  const MOODBOARD_IMAGE_QUALITY = "medium"; // high는 1024x1536에서 503
  ```

#### 비율 블록 조립 규칙

`{CORE_PERSONA_DETAIL_BLOCK}` · `{THEME_PERSONA_DETAIL_BLOCK}`은 `computePersonaResult` 결과를 아래 표로 편다. 열은 **페르소나 · 점수 · 비율 · 핵심 느낌 · 이미지 키워드** — 전부 §1 사전에서 그대로 가져온다. 1등에 🏆, 헤더에 총점을 적는다.

- **"적용 방식" 같은 열은 사전에 없다.** 밴드 규칙이 그 역할을 하므로 페르소나별로 적용법을 따로 서술하지 않는다.

- **① 개수 — 예산을 비율대로 나눈다.**

  ```
  예산: 미학 코어 20개 · 인생 테마 10개  (= §1 사전의 페르소나당 키워드 수)
  개수 = max(1, round(비율 × 예산 / 100))     // 0.5는 올림(Math.round)
  ```

  하한 1개를 보장한다 — 비율 블록에 이름을 올린 페르소나가 키워드를 못 받으면 모델이 표현할 방법이 없다. **상한은 필요 없다**: 사전 크기와 예산이 같아서, 한 페르소나가 100%를 먹어도 넘치지 않는다.

  하한 때문에 합계가 예산과 정확히 맞지는 않는다(코어 20 예산에 21~22개가 나온다). **예산은 고정 총량이 아니라 목표치다** — 키워드 한두 개 차이는 그림을 바꾸지 않는다.

- **② 선택 — 배열에서 균등 간격으로 뽑는다.**

  ```
  n ≤ 2 : 앞에서부터 n개
  n ≥ 3 : i번째 = keys[round(i × (사전길이 - 1) / (n - 1))]   // i = 0 … n-1
  ```

  §1 사전은 **`작은 오브제 → 의상·질감 → 큰 장면`** 순으로 정렬돼 있다. 균등 간격으로 뽑으면 **지배 페르소나는 소품부터 큰 장면까지 고루** 받고, **꼬리는 앞쪽 소품만** 받는다.

  | 페르소나        | 비율 | 개수 | 뽑히는 키워드                                                                                               |
  | --------------- | ---- | ---- | ----------------------------------------------------------------------------------------------------------- |
  | 코스탈          | 40%  | 8    | shell tray, straw hat, seaside breakfast, bare feet, sand texture, **ocean window, coastal home, salt air** |
  | 페어리코어      | 15%  | 3    | tiny mushrooms, sheer fabric, dreamy fog                                                                    |
  | 다크 아카데미아 | 9%   | 2    | candle, fountain pen                                                                                        |
  | 네오 로맨틱     | 1%   | 1    | roses                                                                                                       |

  **"앞에서부터 n개"는 폐기.** 사전이 5~7개였을 땐 지배 페르소나가 어차피 전부 받아 순서가 무의미했지만, 20개로 늘리자 40%가 앞 8개만 받게 됐다 — 조개 접시·유목·유리병 같은 **소품만 쥐고 바다도 코스탈 홈도 못 받는다.** 한 배열의 앞부분을 "지배의 대표 장면"과 "꼬리의 작은 소품"이 동시에 요구하기 때문에, 자르는 위치가 아니라 **뽑는 간격**으로 풀어야 한다.

  > `n ≤ 2`를 앞에서부터 자르는 이유: 균등 간격이면 2개일 때 `[0, 19]`가 되어 꼬리 페르소나가 `gothic architecture` 같은 큰 장면을 받는다. 9%가 화면을 잡아먹지 않게 하려면 앞쪽 소품만 줘야 한다.

  > 폐기된 옛 규칙: 밴드 표(`40%+ 전부 / 10–19% 3–4개 / 5–9% 2–3개 / 1–4% 1–2개`)는 **20–39% 구간이 통째로 비어** 인디 슬리즈 34% 여정의 개수를 정할 수 없었고, 이어 쓴 `clamp(round(비율/4), 1, 사전 크기)`는 사전이 5~7개일 때만 맞는 근사였다.

예 — 코어 1등 코스탈 40% · 테마 1등 코지 홈바디 89% (위 ①②를 적용한 결과):

```
미학 코어 (카드 · fate 배수 적용, 총 8.2점)
| 페르소나          | 점수 | 비율 | 핵심 느낌                    | 이미지 키워드 |
| 코스탈 🏆         | 3.3  | 40%  | 바다, 린넨, 여유, 햇빛        | shell tray, straw hat, seaside breakfast, bare feet, sand texture, ocean window, coastal home, salt air |
| 페어리코어         | 1.2  | 15%  | 몽환, 요정, 투명함, 숲        | tiny mushrooms, sheer fabric, dreamy fog |
| 라이트 아카데미아  | 1.1  | 13%  | 공부, 햇살, 따뜻한 지성       | pressed flowers, ivory tote bag, morning study session |
| 클린 걸           | 0.9  | 11%  | 자기관리, 맑음, 루틴, 정돈    | matcha latte, gold hoop earrings |
| 다크 아카데미아    | 0.7  | 9%   | 지적, 어두움, 고전, 고독      | candle, fountain pen |
| 코티지코어         | 0.6  | 7%   | 자연, 손맛, 목가적, 느린 삶   | wildflowers |
| 코케트            | 0.3  | 4%   | 리본, 여림, 로맨틱, 소녀성    | ribbons |
| 네오 로맨틱        | 0.1  | 1%   | 현대적 낭만, 감정, 도시의 시  | roses |

인생 테마 (카드 + 전환, 총 5.3점)
| 페르소나        | 점수 | 비율 | 핵심 느낌               | 이미지 키워드 |
| 코지 홈바디 🏆  | 4.7  | 89%  | 집, 안정, 귀여움, 온기   | tea, soft socks, plush toy, book stack, blanket, pajamas, lamp light, cozy sofa, warm bedroom |
| 스피리추얼      | 0.3  | 6%   | 운명, 우주, 신비, 내면   | crystals |
| 트래블러        | 0.3  | 6%   | 자유, 이동, 낯선 풍경    | passport |
```

동점·꼬리가 몰린 대조 사례 (인디 슬리즈 34% · 소프트 그런지 34% 코어 / 트래블러 53% 테마):

```
| 인디 슬리즈 🏆  | 34% | 7개 | red lipstick stain, vintage camera, smudged makeup, messy hair, grainy film, night street, cigarette smoke atmosphere |
| 소프트 그런지   | 34% | 7개 | silver rings, vinyl records, dark floral print, oversized hoodie, leather boots, guitar, soft grunge |
| 맥시멀 글램     | 16% | 3개 | statement earrings, velvet, editorial pose |
| Y2K 키치        | 13% | 3개 | star stickers, fuzzy bag, retro web graphics |
| 네오 로맨틱     |  2% | 1개 | roses |
| 클린 걸         |  1% | 1개 | matcha latte |

| 트래블러 🏆     | 53% | 5개 | passport, map, suitcase, motel, road trip |
| 코지 홈바디     | 26% | 3개 | tea, blanket, warm bedroom |
| 웰니스 러너     | 21% | 2개 | hydration bottle, green smoothie |
```

#### 프롬프트 템플릿 (박제)

**→ 템플릿 전문은 [moodboard-image-prompt.md](./moodboard-image-prompt.md) 에 있다.** `{LAYOUT_STYLE_BLOCK}`([moodboard-layout.md](./moodboard-layout.md)) · `{CORE_PERSONA_DETAIL_BLOCK}` · `{THEME_PERSONA_DETAIL_BLOCK}` 세 자리를 치환한다. **유형명(`type_name`)은 넣지 않는다** — 비율 블록이 룩과 삶의 장면을 모두 규정하므로 유형명 문자열은 프롬프트에 기여하지 않는다.
