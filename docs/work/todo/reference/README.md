# 카드 이미지 수집 가이드 (36장)

> 📌 **수집 진행 중** — 담당: dev0leee · 기한: 7/7 · 작업 이슈: #38 (이 브랜치 PR에 이미지를 커밋한다)

추구미 테스트 카드 풀([mood-test-questions.md](../mood-test-questions.md) 카드 테이블)의 이미지를 이 폴더에 수집한다. **카드당 1장, 파일명은 카드 id** (`c01.jpg` ~ `c36.jpg`).

## 이미지 기준

- **감성 디테일 컷**: 스타일 이름이 아니라 한 장면·한 사물 ("싱크대에 꽂은 꽃" 급). 카드 라벨이 사진의 주인공이어야 한다.
- **얼굴 금지**: 식별 가능한 인물 불가 (초상권 — 손·뒷모습·실루엣은 허용).
- **로고/브랜드 금지**: 상표가 읽히는 컷 불가.
- **비율 세로 3:4 권장** (카드 그리드 3열, 모바일 기준), 긴 변 1200px 이상.
- 36장의 톤이 서로 어울려야 한다 — 채도·명도가 튀는 컷은 재검토.

## 허용 소스 & 저작권 규칙

| 소스 | 용도 | 규칙 |
| --- | --- | --- |
| [Unsplash](https://unsplash.com) · [Pexels](https://pexels.com) | **주 소스** | 상업 이용 무료, 출처 표기 의무 없음. 단 얼굴·로고 컷 배제, **출처 URL을 아래 표에 반드시 기록** (방어 근거) |
| fal.ai FLUX schnell (자체 생성) | **보완** — 스톡에서 결이 안 나오는 카드 | 생성물 상업 이용 가능. 카드의 프롬프트 태그로 생성, 출처란에 `AI생성` + 프롬프트 기록 |
| ~~Pinterest, 구글 이미지, 인스타그램~~ | ❌ **사용 금지** | 출처가 아니라 수집기 — 라이선스 없음. 느낌 참고(무드보드)로만 사용 |

## 혼동 쌍 판별 질문 (태깅 검수용)

수집한 이미지가 카드의 페르소나와 맞는지 아래 질문으로 검증한다. 두 질문에 다 걸리면(예: 리본 달린 러닝화) **피사체의 주인공**으로 판단하고, 그래도 애매하면 태그를 2개 다 붙인다 (매칭은 가중합이라 복수 태그 허용이 안전).

| 혼동 쌍 | 판별 질문 | A로 태깅 | B로 태깅 |
| --- | --- | --- | --- |
| 코케트 vs 클린 걸 | 장식이 있는가? | 리본·레이스·새틴·하트·진주 → 코케트 | 무장식·정돈·물병·린넨 → 클린 걸 |
| 올드 머니 vs 클린 걸 | 부의 기호인가, 루틴의 기호인가? | 테니스장·트위드·은식기·승마 → 올드 머니 | 아침 루틴·요가·침구 → 클린 걸 |
| 다크 아카데미아 vs 테크 노어 | 과거인가 미래인가? | 고서·양초·목재·만년필 → 다크 아카데미아 | 금속·유리·모니터 글로우·콘크리트 → 테크 노어 |
| 인디 슬리즈 vs Y2K | 질감인가 색인가? | 과다노출 플래시·그레인·클럽 어둠 → 인디 슬리즈 | 글로시·원색·Y2K 가젯(폴더폰·비즈) → Y2K |
| 코티지코어 vs 코지 홈바디 | 야외(자연)인가 실내(도시 집)인가? | 시골 부엌·정원·들판 → 코티지코어 | 홈카페·담요·창가 비 → 코지 홈바디 |
| 페어리코어 vs 스피리추얼 | 자연의 빛인가 상징 체계인가? | 빛망울·숲 안개·반딧불 → 페어리코어 | 타로·별자리 차트·수정·달 → 스피리추얼 |
| 코스탈 vs 트래블러 | 머무는가 떠나는가? | 리넨·해변 수건·느린 오후 → 코스탈 | 공항·배낭·티켓·플랫폼 → 트래블러 |
| 웰니스 러너 vs 클린 걸 | 땀(움직임)이 보이는가? | 러닝화·기록·스무디볼 → 웰니스 러너 | 정지된 정돈 장면 → 클린 걸 |
| 코케트 vs 네오 로맨틱 | 키치한가 성숙한가? | 파스텔·리본·하트 (사랑스러움) → 코케트 | 레이스·시어·겹침·차분한 톤 (성숙한 로맨스) → 네오 로맨틱 |
| 페어리코어 vs 코티지코어 | 빛(몽환)인가 노동(생활)인가? | 빛내림·안개·반짝임 → 페어리코어 | 빵 굽기·텃밭·부엌 → 코티지코어 |
| Y2K vs 맥시멀 글램 | 플라스틱인가 텍스처인가? | 원색·글리터·가젯 → Y2K | 벨벳·주얼 톤·드라마틱 스타일링 → 맥시멀 글램 |

## 수집 체크리스트 (36장)

검색 키워드는 카드의 프롬프트 태그 기반 — Unsplash/Pexels에서 영문으로 검색한다.

| id | 카드 | 검색 키워드 (EN) | 파일 | 출처 URL | 확인 |
| --- | --- | --- | --- | --- | --- |
| c01 | 새벽 요가 매트 | yoga mat morning light minimal | | | ☐ |
| c02 | 정돈된 화장대 | minimal vanity table neutral tone | | | ☐ |
| c03 | 테니스 코트 | tennis court vintage green | | | ☐ |
| c04 | 요트 위 리넨 셔츠 | linen shirt sailboat breeze | | | ☐ |
| c05 | 새틴 리본 발레슈즈 | ballet shoes satin ribbon pastel | | | ☐ |
| c06 | 딸기 케이크와 도일리 | strawberry cake lace doily | | | ☐ |
| c07 | 반짝이 폴더폰 | y2k flip phone glitter pink | | | ☐ |
| c08 | 비즈 목걸이 무더기 | colorful beaded necklaces pile | | | ☐ |
| c09 | 플래시 터진 파티 스냅 | party flash photo grain night (얼굴 없는 컷: 손·잔·조명) | | | ☐ |
| c10 | 지하 공연장 스티커 벽 | sticker covered wall grunge venue | | | ☐ |
| c11 | 촛불 아래 고서 | old books candlelight antique | | | ☐ |
| c12 | 오래된 도서관 사다리 | old library wooden ladder shelves | | | ☐ |
| c13 | 크림톤 노트와 아침 커피 | cream notebook coffee morning desk | | | ☐ |
| c14 | 오전의 스터디 카페 창가 | cafe window seat morning study | | | ☐ |
| c15 | 갓 구운 빵과 밀가루 손 | baking bread flour hands rustic | | | ☐ |
| c16 | 텃밭에서 딴 채소 바구니 | vegetable basket garden harvest | | | ☐ |
| c17 | 숲속 빛내림 | forest light rays mist morning | | | ☐ |
| c18 | 유리병 속 페어리라이트 | fairy lights glass jar bokeh dusk | | | ☐ |
| c19 | 파도 거품과 소금기 | wave foam closeup shore | | | ☐ |
| c20 | 모래 위 맨발 | barefoot sand beach walk | | | ☐ |
| c21 | 가죽 재킷과 체인 | black leather jacket chain detail | | | ☐ |
| c22 | 흑백 콘서트 조명 | concert stage lights black white | | | ☐ |
| c23 | 다크 모노톤 데스크 셋업 | dark minimal desk setup monochrome | | | ☐ |
| c24 | 금속 프레임의 네온 반사 | neon light reflection chrome metal | | | ☐ |
| c25 | 과감한 패턴 벨벳 소파 | velvet sofa jewel tone bold pattern | | | ☐ |
| c26 | 반짝이는 드레스룸 거울 | vanity mirror bulbs glam dressing | | | ☐ |
| c27 | 시어 커튼 사이 레이스 | sheer curtain lace soft daylight | | | ☐ |
| c28 | 빛바랜 러브레터 | old handwritten letter sepia envelope | | | ☐ |
| c29 | 네잎클로버 책갈피 | four leaf clover pressed book | | | ☐ |
| c30 | 공항 라운지의 노트북 | airport lounge laptop runway window | | | ☐ |
| c31 | 러닝 후 기록 화면 | running shoes fitness watch sunrise | | | ☐ |
| c32 | 기차역 플랫폼의 배낭 | train platform backpack early morning | | | ☐ |
| c33 | 낡은 여권과 스탬프 | worn passport stamps travel | | | ☐ |
| c34 | 타로 카드와 달 조명 | tarot cards candle moon night | | | ☐ |
| c35 | 담요 속 고양이와 낮잠 | cat sleeping blanket cozy afternoon | | | ☐ |
| c36 | 홈카페 라떼와 창밖 비 | latte art window rain cozy home | | | ☐ |

## 수집 후

1. 파일명을 `c{id}.jpg`로 저장 → 이 폴더에 커밋
2. 위 표에 출처 URL 기입 + 확인 체크
3. 혼동 쌍 질문으로 태깅 검수 (특히 c01·c02·c31, c07·c08·c25·c26, c11·c23)
4. 스톡에서 못 채운 카드는 fal.ai 생성으로 보완 (프롬프트 태그 사용)
