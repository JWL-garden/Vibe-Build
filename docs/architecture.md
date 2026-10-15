# Vibe Build 아키텍처 (백엔드 → 프론트엔드)

> 작성: 2026-10-13 · 기준: 저장소 실제 폴더 구성, `docs/design.md`, `docs/tech-stack.md`
> 이 프로젝트는 **별도 DB·백엔드 서버가 없는 구조**다. 데이터는 엑셀을 JSON으로 변환해 저장소에 두고, 계산은 순수 TypeScript 함수로 하며, 화면은 Next.js가 그린다. "백엔드"에 해당하는 것은 데이터 계층, 계산 엔진, 얇은 API 라우트다.

## 1. 전체 흐름

```
[기준 엑셀 · 가정값 엑셀]  (상위 폴더, 저장소에 안 올림)
        │  npm run data:excel  (scripts/build-excel-data.mjs, xlsx)
        ▼
[lib/data/*.json]  ← 변환된 정답 데이터 (커밋됨)
        │
[lib/rules]  법규·완화 시나리오·비용 규칙 (설정 데이터)
        │
        ▼
[lib/calc]  순수 함수 계산 엔진 ──► runAll() 결과 한 덩어리
        │                              │
        ▼                              ▼
[lib/report] 보고서 조립      [store/analysisStore] Zustand
        │                              │
        ▼                              ▼
[app/report] 보고서 (A4)       [app/analysis] 분석 화면 (단계 컴포넌트 + 3D)
```

핵심 원칙
1. 화면과 보고서의 모든 숫자는 `lib/calc/index.ts`의 `runAll` 결과만 사용한다 (화면에서 다시 계산하지 않음).
2. 법규·단가·시세 값은 코드에 하드코딩하지 않고 `lib/rules`·`lib/data`에서 읽는다.
3. 건축물 숫자의 정답은 기준 엑셀이며, 계산 결과는 엑셀 값과 Vitest로 대조한다.
4. 외부 API는 반드시 `app/api/` 서버를 거치고, 실패하면 mock으로 대체한다.

## 2. 백엔드 계층

### 2-1. 데이터 계층 (`lib/data`, `scripts`)

| 구성 | 역할 |
|---|---|
| 기준 엑셀 → `sites.json`, `units.json`, `parkingReview.json`, `landPrice.json`, `landLots.json` | 건축물 숫자의 정답 (대지·연면적·층수·호별 면적·주차) |
| 가정값 입력 엑셀 → `lib/data/inputs/*.json` | 수익성 가정값(보수/기준/낙관), 임대 사례, 증축계획안 연면적(`plannedGfa.json`) |
| `siteInputs.json` | 엑셀에 없는 수기 입력 (정북 이격, 필로티, 토지 구성 필지, 증축계획안 PNU 연결) |
| `massAreas.json`, `construction.json` | 3D 모델에서 추출한 측면 보강 면적, 공사비 실적 |
| `source.json`, `sheetMap.json` | 어느 엑셀의 어느 시트를 쓰는지, 입력 버전·기준일 |
| `scripts/` | 엑셀 변환(`build-excel-data`), 입력 양식 생성(`make-input-template`), 데이터 검증(`check-data`), 3D 모델 경량화(`trim-mass-model`), 임대 사례 수집(`fetch-rent-comps`), 건축물대장 CSV 변환(`build-buildings`) |

### 2-2. 설정 계층 (`lib/rules`)

| 파일 | 내용 |
|---|---|
| `baseRules.ts` | 현행 법규 (일조·주택 층수·주택 연면적·주차·재건축 규칙) |
| `scenarios.ts` | 완화 시나리오(BASE/A/B/C/ALL)와 화면용 3개(현행법규 / 증축 계획안 / 재건축 계획안) |
| `zoningTable.ts` | 용도지역별 용적률·건폐율 |
| `financeDefaults.ts`, `financeScenarios.ts` | 수익성 규칙, 가정값 항목 정의, 보수/기준/낙관 |
| `projectSchedule.ts`, `policies.ts` | 추진 일정 가정, 정책 정보 |

### 2-3. 계산 엔진 (`lib/calc`, 순수 함수 + Vitest)

| 파일 | 계산 내용 |
|---|---|
| `far.ts` | 용적률·건폐율, 완화 상한 적용 최대 연면적 |
| `sunlight.ts` | 정북 일조 사선 허용 높이 |
| `parking.ts` | 법정 주차, 여유대수, 옥탑세대 조합 |
| `housingLimit.ts` | 주택 층수·연면적 한도 |
| `floorPlate.ts` | 증축층 바닥면적 |
| `expansion.ts` | 증축 가능 규모 (주차·용적률·주택 한도 중 최솟값, 제한요인) |
| `rebuild.ts` | 전체 재건축 규모 |
| `finance.ts` | 사업비, 임대수입, ROI, 자산가치, 20년 현금흐름, NPV·IRR |
| `constructionCost.ts` | 공사비 실적 기반 신축 단가·공사 기간 |
| `assumptions.ts` | 가정값 병합 (사용자 입력 > 입력 엑셀) |
| `sensitivity.ts` | 민감도(토네이도) |
| `excelParity.ts` | 기준 엑셀 값과 대조 |
| `index.ts` | **`runAll`**: 모든 결과를 한 객체로 반환 |

### 2-4. 서비스·API 계층

- `lib/services`: `dataService`가 입구이고 `mockService`(JSON)와 `apiService`(서버 API)를 전환한다. 실패하면 mock으로 대체한다.
- `app/api/address`, `building`, `landuse`, `nearby`: Next.js Route Handler(서버). 외부 공공 API를 서버에서 호출해 키를 숨긴다. 키는 `.env.local`(깃 제외).

### 2-5. 보고서 조립 (`lib/report`)

`buildSiteReport`가 `runAll` 결과를 장별 데이터(표지·1~10장·부록)로 바꾼다.

| 파일 | 역할 |
|---|---|
| `buildSiteReport.ts`, `financeSection.ts`, `scenarioSection.ts` | 장별 데이터 조립 (사업비·수익·시나리오) |
| `narrative.ts` | 숫자를 넣는 문장 템플릿 (AI 호출 없음) |
| `risks.ts` | 규칙 기반 리스크 |
| `partners.ts`, `nextStep.ts`, `schedule.ts` | 협업 구성, 다음 단계, 추진 일정 |
| `paginate.ts` | A4 쪽 나눔 (블록 높이를 측정해 쪽에 배치) |

보고서 컴포넌트는 이 데이터만 읽고 직접 계산하지 않는다.

## 3. 프론트엔드 계층

| 구분 | 위치 | 내용 |
|---|---|---|
| 라우팅 | `app/page.tsx` → `app/analysis` → `app/report` | 주소 입력 → 분석 → 보고서 |
| 상태 | `store/analysisStore.ts` (Zustand) | 필지·시나리오·가정값 입력, `runAll` 결과, 3D 캡처 |
| 분석 화면 | `components/steps/Step1~9` | 건축물 정보 → 건축 시나리오 선택 → 기본 계획안(3D) → 건축개요 → 수익성 분석 → 판정·보고서 버튼 |
| 3D | `components/three` | React Three Fiber로 GLB 매스 모델 표시. 증축 전/후, 재건축 매스 (`ParcelMassView`, `MassView`) |
| 차트 | `components/charts` | Recharts 1개(`CashflowChart`) + 직접 SVG 3개 |
| 보고서 | `components/report` (`site/` 하위) | A4 210×297mm 쪽, 인쇄 CSS로 PDF 저장 |
| 공통 | `components/layout`, `app/globals.css` | 헤더·스테퍼, 디자인 토큰(Tailwind v4 `@theme`), 글꼴 Noto Sans/Serif KR |
| 3D 좌표·모델 도우미 | `lib/geo` | 좌표 변환, GLB 노드 파싱(`massModel`), 카메라 맞춤, 모델 보유 필지 판별 |

### 3-1. 3D 모델 규칙

- 파일: `public/models/261015_dangsan_sunlight_v6_T1T2.glb` (원본에서 T1·T2와 반경 165m 주변만 남긴 약 2MB 경량판)
- 노드 이름: `{PNU 19자리}_{EXIST|REV}_F{층}[_SIDE|_TOP]` + `TERRAIN`
- 좌표: x=동쪽, -z=북쪽, y=높이, 대상 건물 중심 (0,0), 단위 m
- Tailwind v4는 큰 바이너리 때문에 `@source not "../public/models"` 설정이 필요하다.

## 4. 배포·품질

| 항목 | 내용 |
|---|---|
| 배포 | GitHub `JWL-garden/Vibe-Build` main에 push하면 Vercel이 자동 빌드·배포 |
| 테스트 | Vitest (계산·엑셀 대조·보고서 숫자) |
| 정적 검사 | ESLint, `tsc`, `next build`, `npm run data:check` |
| 설계 기준 | `docs/design.md`가 정답, 작업 규칙은 `CLAUDE.md` |
| 관련 문서 | `docs/tech-stack.md`(기술 스택·디자인 현황), `docs/data-changelog.md`(가정값 변경 이력) |

## 5. 한 줄 요약

엑셀 → JSON(데이터) → rules(법규 설정) → calc(순수 계산, `runAll`) → report 조립 → Zustand → React 화면·3D·A4 보고서 순서로 단방향이며, 서버는 외부 공공 API 호출용 Route Handler뿐이다.
