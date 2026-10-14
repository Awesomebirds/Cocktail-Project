# 메뉴 운영

- 공개 메뉴: 30종. 기존 보유 재료로 만들 수 있는 대표 메뉴를 중심으로 선정하고, 국내 파티에서 선택하기 쉬운 피치 크러시·옥보단·카시스 오렌지를 함께 유지했다. 인기 순위 통계에 따른 선정은 아니다.
- 보관 메뉴: 45종. `/bar/`에서 볼 수 있다. 일반적인 정적 호스팅은 `/bar` 요청을 `/bar/`로 이동시킨다. GitHub Pages 프로젝트 주소에서는 `/<저장소명>/bar/`를 사용한다.
- `/bar` 링크는 공개 화면에 없고 검색엔진 제외 메타 태그를 넣었다. 사용자 선택에 따라 인증은 없으며 주소를 알면 접근할 수 있다.
- 위스키 하이볼은 45 ml : 탄산수 135 ml 하나로 통합했다. 사쿠라오 또는 블랙 루비를 선택한다. 기존 블랙 루비 하이볼과 버번 크랜베리 배합은 보관한다.
- 워드 에이트와 라이 사워는 보관함에만 둔다. 원본 보유 목록의 라이 위스키는 과거 레시피의 재료 기록으로 남겼다.
- 그레나딘은 보유 재료다.
- 보유 잔 3종에 맞춰 `plastic`, `cocktail`, `rocks`를 배정했다. 일반 플라스틱잔은 얼음이 담긴 긴 유리잔 형태, 락글라스는 중간 선 없이 얼음이 담긴 형태의 SVG로 표시한다. 별도의 잔 안내와 샴페인잔 SVG는 사용하지 않는다.
- 공개 메뉴의 첫 화면은 추천 8종이다. 보관함은 전체 45종으로 시작한다.

## 레시피 표기

- [엘 디아블로](https://www.diffordsguide.com/cocktails/recipe/700/el-diablo-cocktail): 진저에일 레시피의 전례가 있어 ‘스타일’을 제거했다. 현재 배합은 보유 재료에 맞춘 비율로 명시했다.
- [모스크바 뮬](https://iba-world.com/iba-cocktail/moscow-mule/): 진저비어 대신 진저에일을 쓰는 변형임을 표시했다.
- 팔로마는 자몽주스 버전, 갓파더는 버번 버전, 초콜릿 마티니와 옥보단은 하우스 레시피로 설명한다.
- 이번 변경은 메뉴 압축·분류·잔 표시 중심이다. 75종 도수 전체 재계산은 수행하지 않았으며 기존 추정치임을 상세 화면에 표시했다.

## 데이터 갱신

JSON을 직접 수정한다. 공개 메뉴의 원본은 `cocktails.json`, 보관 메뉴의 원본은 `bar/cocktails.json`이다. 별도 변환 과정은 없다.

### 어떤 파일을 수정해야 하나요?

브라우저는 Markdown이나 Python을 실행하지 않는다. 공개 화면은 `cocktails.json`, `/bar/`는 `bar/cocktails.json`을 읽고 `app.js`가 카드와 상세창을 만든다. 화면 배치는 `index.html`·`bar/index.html`, 디자인은 공통 `style.css`가 담당한다.

JSON의 `name`과 `description`을 수정하면 반영된다. 서버에 수정 파일을 배포한 뒤 페이지를 새로고침해야 하며, 이미 열려 있는 화면이 실시간으로 바뀌지는 않는다.

권장 순서: 해당 JSON 수정 → 검토 및 배포 → 새로고침.

공개 메뉴에서 보관함으로 옮길 때는 해당 칵테일 객체를 공개 JSON의 `cocktails` 배열에서 제거하고 보관 JSON의 배열에 추가한다. `public`은 false, `featured`는 false로 바꾸고 `archiveReason`을 적는다. 반대로 공개할 때는 객체를 공개 JSON으로 옮기고 `public`을 true로 바꾼다. ID가 중복되거나 객체가 누락되지 않도록 확인한다.

| JSON 필드 | 화면에서 쓰이는 곳 |
|---|---|
| `name`, `description` | 카드와 상세창의 이름·설명 |
| `ingredients` | 상세창의 재료 이름(`item`)과 용량(`amount`) |
| `featured` | 추천 탭과 추천 표시. true/false 사용 |
| `category` | 주종 필터. gin, vodka, rum, tequila, whisky, liqueur, dessert, cocktail |
| `abv` | ALC 숫자와 도수 필터. 소수점 가능; `abvText`는 현재 화면에서 사용하지 않음 |
| `sweetness`, `sourness` | 0~5 맛 표시와 필터 |
| `glassType` | SVG 종류: plastic, cocktail, rocks |
| `recipeNote`, `archiveReason` | 상세 설명과 보관 사유 |
| `id` | 레시피 식별과 상세창 기록. 이름을 바꿔도 ID는 유지 |
| `public` | 관리용 공개 여부 기록. 실제 노출 위치는 객체가 들어 있는 JSON 파일로 결정되며 이 값만 바꿔서는 이동하지 않음 |

이름·설명은 HTML 코드가 아닌 일반 텍스트로 표시한다. 잘못된 JSON, 중복 ID, 잘못된 수치·재료 형식은 로딩 오류로 처리한다. 제조·가니시 등 화면에서 제거된 항목은 원본 기록으로 보존한다. 새 카테고리나 새로운 잔 디자인을 추가할 때는 화면 코드 수정도 필요하다.

검증: Playwright와 Edge가 설치된 환경에서 `node tests/menu.test.cjs`. 정적 서버를 자체 실행하고 종료한다.

배포에 필요한 파일은 `index.html`, `app.js`, `style.css`, `cocktails.json`, `bar/index.html`, `bar/cocktails.json`이다. 이 안내서와 `tests/`는 유지보수용이며 배포하지 않아도 된다. 현재 테스트는 30종·45종 및 특정 메뉴 구성을 검증하므로 메뉴 수나 구성을 의도적으로 변경할 때는 해당 기대값도 갱신한다.
