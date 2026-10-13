// 프로젝트 전체에서 쓰는 데이터 형태(타입) 정의 — 설계서 4장 기준
//
// 이름 규칙 (변수명 끝에 단위를 붙인다)
//   ...M       길이 (m)              ...M2      면적 (㎡)
//   ...Percent 용적률·건폐율 (%, 200 = 200%)
//   ...Rate    비율·이율 (소수, 0.05 = 5%)   ← 계산식에 바로 곱하기 위해 소수로 둔다
//   ...Won     금액 (원)             ...Months / ...Years  기간
//
// 좌표 규칙: 대상 건물 중심이 (0,0), 미터 단위, x = 동쪽, y = 북쪽 (평면도 기준).
//   3D에서는 y(북쪽)를 -z로 바꿔 그린다 (설계서 7-3).

// ═════════════════════════════════════════════
// 공통
// ═════════════════════════════════════════════

/** 데이터 출처 — 화면·보고서에 "샘플 데이터 / 실제 데이터" 표기용 */
export type DataSource = 'sample' | 'registry' | 'api'

/** 샘플 id (설계서 8장) */
export type SampleId = 'S1' | 'S2' | 'S3'

/** 평면 좌표 한 점 (m). x = 동쪽(+), y = 북쪽(+) */
export interface Point2 {
  x: number
  y: number
}

/** 다각형 꼭짓점 목록 (닫는 점은 반복하지 않음) */
export type Polygon = Point2[]

/** 용도지역 이름 (지역지구구역 데이터 표기와 동일) */
export type ZoneName =
  | '제1종전용주거지역'
  | '제2종전용주거지역'
  | '제1종일반주거지역'
  | '제2종일반주거지역'
  | '제3종일반주거지역'
  | '준주거지역'
  | '중심상업지역'
  | '일반상업지역'
  | '근린상업지역'
  | '유통상업지역'
  | '전용공업지역'
  | '일반공업지역'
  | '준공업지역'

// ═════════════════════════════════════════════
// 4-1. 대상 건축물
// ═════════════════════════════════════════════

/** 주소 (다른 API 조회 키) */
export interface Address {
  /** 도로명 주소 (없으면 null) */
  roadAddress: string | null
  /** 지번 주소 */
  jibunAddress: string
  /** 필지 고유번호 19자리 = 시군구(5) + 법정동(5) + 대지구분(1) + 번(4) + 지(4) */
  pnu: string
  /** 시군구코드 5자리 */
  sigunguCode: string
  /** 법정동코드 5자리 */
  bjdongCode: string
  /** 본번 4자리 (예: '0003') */
  bun: string
  /** 부번 4자리 (예: '0001') */
  ji: string
  /** 위도·경도 (모르면 null) */
  lat: number | null
  lng: number | null
}

/** 대상 건축물 — 건축물대장 표제부 + 용도지역 + 형상 */
export interface TargetBuilding {
  /** 고유 id (샘플은 'S1' 등, 실제 데이터는 관리건축물대장PK) */
  id: string
  /** 데이터 출처 */
  source: DataSource
  address: Address
  /** 건물명 (없으면 null) */
  buildingName: string | null
  /** 용도지역 */
  zone: ZoneName
  /** 대지면적 (㎡) */
  siteAreaM2: number
  /** 건축면적 (㎡) */
  buildingAreaM2: number
  /** 연면적 (㎡) — 지하 포함 */
  totalFloorAreaM2: number
  /** 용적률산정 연면적 (㎡) — 지하·주차 등 제외, 용적률 계산에 사용 */
  farFloorAreaM2: number
  /** 기준층 바닥면적 (㎡) — 증축층 면적으로 사용 (설계서 4-3 가정) */
  typicalFloorAreaM2: number
  /** 지상 층수 */
  floorsAbove: number
  /** 지하 층수 */
  floorsBelow: number
  /** 건물 높이 (m) */
  heightM: number
  /** 주용도 (예: 제2종근린생활시설) */
  mainUse: string
  /** 기타용도 (없으면 null) */
  etcUse: string | null
  /** 세대수 */
  households: number
  /** 구조 (예: 철근콘크리트구조) */
  structure: string
  /** 사용승인일 (YYYY-MM-DD). 경과연수 → 구조 리스크 판단에 사용 */
  approvalDate: string
  /** 건물 북측 외벽에서 정북방향 인접대지경계선까지 거리 (m) — 일조권 계산 */
  northSetbackM: number
  /** 대지 경계 (로컬 좌표, 없으면 null) */
  siteBoundary: Polygon | null
  /** 건물 외곽선 (로컬 좌표, 없으면 null → 3D에서 건축면적 기준 정사각형으로 대체) */
  footprint: Polygon | null
}

// ═════════════════════════════════════════════
// 4-2. 주변 건축물
// ═════════════════════════════════════════════

/** 8방위 (대상 건물에서 본 방향) */
export type Direction8 = '북' | '북동' | '동' | '남동' | '남' | '남서' | '서' | '북서'

/** 주변 건축물 */
export interface NearbyBuilding {
  id: string
  /** 건물명 또는 용도 (표 표시용, 없으면 null) */
  name: string | null
  /** 외곽 폴리곤 (로컬 좌표). 없으면 center + 크기로 박스를 그린다 */
  footprint: Polygon | null
  /** 건물 중심 (로컬 좌표, m) */
  center: Point2
  /** 동서 폭 (m) */
  widthM: number
  /** 남북 깊이 (m) */
  depthM: number
  /** 지상 층수 */
  floorsAbove: number
  /** 높이 (m) */
  heightM: number
  /** 대상 건물 중심에서의 거리 (m) */
  distanceM: number
  /** 방위각 (도). 정북 0°, 시계방향 */
  bearingDeg: number
  direction: Direction8
  /** 정북측 인접 건물이면 true → 화면에서 강조 */
  isNorth: boolean
}

// ═════════════════════════════════════════════
// 4-3. 법규 기준 + 완화 시나리오 (설계서 6-1)
// ═════════════════════════════════════════════

/** 용도지역별 기준표의 한 줄 (지자체 조례 기준) */
export interface ZoneRule {
  zone: ZoneName
  /** 용적률 상한 (%) */
  farLimitPercent: number
  /** 건폐율 상한 (%) */
  bcrLimitPercent: number
  /** 정북방향 일조 사선 적용 여부 (전용·일반주거지역만 true) */
  sunlightApplies: boolean
}

/** 정북방향 일조 사선 규칙 (건축법 시행령 제86조) */
export interface SunlightRule {
  /** 일조 사선 적용 여부 — 용도지역이 상업·공업 등이면 false */
  applies: boolean
  /** 기준높이 (m) — 현행 10 */
  lowHeightM: number
  /** 기준높이 이하 부분의 최소 이격거리 (m) — 현행 1.5 */
  lowSetbackM: number
  /** 기준높이 초과 부분: 이격거리 ≥ 높이 × 이 비율 — 현행 0.5 */
  ratio: number
  /** 다가구·다세대 건축물의 수직 건축 허용 높이 (m) — 이 높이까지는 lowSetbackM 만 띄우면 된다.
   *  null = 일반 기준(lowHeightM). 8·13 대책 '일조 4~5층도 수직 건축 허용' → 15 (프로젝트 가정) */
  multiFamilyLowHeightM: number | null
}

/** 주택 층수·연면적 한도를 적용하는 주택 유형 (건축법 시행령 별표1) */
export type HousingType = '다세대' | '다가구' | '다중주택'

/** 주택 층수·연면적 한도 (설계서 5-3b) */
export interface HousingRule {
  /** 주택으로 쓰는 층수 한도 (개층) — 현행 다세대 4, 다가구·다중 3 / 8·13 대책 다가구 4 */
  maxFloors: Record<HousingType, number>
  /** 주택 바닥면적 합계 한도 (㎡) — 현행 660 이하 / 8·13 대책 다가구·다세대 1,000 미만 */
  maxAreaM2: Record<HousingType, number>
  /** true = 면적 한도 '미만', false = '이하' */
  areaExclusive: Record<HousingType, boolean>
  /** true면 1층 필로티(주차 전용)를 주택 층수에서 제외 */
  excludePilotiFloor: boolean
}

/** 세대 전용면적 구간별 주차 기준 (제5호 세대기준) */
export interface ParkingPerUnitStep {
  /** 이 구간의 전용면적 상한 (㎡, 이하). null = 상한 없음 */
  maxNetM2: number | null
  /** 세대당 주차대수 (대) */
  spaces: number
}

/** 주차 기준 (서울시 주차장 조례 별표2, 기준 엑셀과 동일 — 설계서 5-3a) */
export interface ParkingRule {
  /** 주택(제5호) 세대당 기준 — 전용 30㎡ 이하 0.5 / 60㎡ 이하 0.8 / 초과 1.0 */
  perUnit: ParkingPerUnitStep[]
  /** 근린생활시설(제3호): 시설면적 이 값(㎡)당 1대 — 134 */
  neighborhoodM2PerSpace: number
  /** 일반업무시설(제2-1호): 시설면적 이 값(㎡)당 1대 — 100 (기타용도가 '사무소'로만 표기된 호) */
  officeM2PerSpace: number
  /** 비주택 용도별 대수를 남길 소수 자릿수 (그 아래는 절사, 비고4) — 1 */
  nonHousingDecimals: number
  /** 추가 세대의 최소 전용면적 (㎡) — 15 미만이면 추가 불가 */
  minUnitNetM2: number
  /** 증축분(옥탑세대) 세대당 최소 면적 (㎡) — 연면적 = 전용면적으로 보고 이 값으로 나눠 최대 세대 수를 정한다 */
  addedUnitMinNetM2: number
  /** 증축분(옥탑세대) 전용률 (0~1) — 1 = 연면적과 전용면적을 구분하지 않음 */
  addedUnitNetRatio: number
  /** 단독주택·다중주택(제4호): 시설면적 minM2 초과 ~ baseM2 이하 baseSpaces대, baseM2 초과분은 extraM2PerSpace㎡당 1대 */
  detached: { minM2: number; baseM2: number; baseSpaces: number; extraM2PerSpace: number }
  /** 주택법 기준(제5호 비교용): 전용 smallMaxNetM2 이하 smallM2PerSpace㎡당 1대, 초과 largeM2PerSpace㎡당 1대 */
  housingAct: { smallMaxNetM2: number; smallM2PerSpace: number; largeM2PerSpace: number }
  /** 다가구 가구별 전용면적 = 연면적 × 이 비율 ÷ 가구수 (기준 엑셀 가정 0.8) */
  multiFamilyNetRatio: number
}

/** 계산에 넣는 규칙 (baseRules + 시나리오 overrides 를 합친 결과) */
export interface Rules {
  sunlight: SunlightRule
  /** 용도지역별 용적률 상한 (%) — 완화 시나리오는 배수가 아니라 이 값을 교체한다 (v3) */
  farLimitByZone: Partial<Record<ZoneName, number>>
  housing: HousingRule
  parking: ParkingRule
  /** 기타 제한에 의한 최대 증축 층수 (없으면 null) */
  maxAddFloors: number | null
  /** 증축 층고 (m) — 기본 3.3 */
  floorHeightM: number
  /** 전체 재건축(철거 후 신축) 가정 — 기준 엑셀 '빈땅_신축시나리오' 산식 */
  rebuild: RebuildRule
  /** 증축층 바닥면적 산정 (옵션1·2) */
  floorPlate: FloorPlateRule
  /** 측면 보강부(3D 모델 REV_F{n}_SIDE) 처리 */
  massSide: MassSideRule
}

/** 측면 보강부 규칙 (2026-10-12 결정) — 일조 사선 완화로 기존 층 측면을 채우는 면적 */
export interface MassSideRule {
  /** true면 3D 모델에서 추출한 측면 보강부 면적을 증축 연면적에 더한다 (용적률·주택 연면적 잔여 범위 안에서) */
  includeInGfa: boolean
}

/** 증축층 바닥면적 산정 규칙 (2026-10-08 결정 8) */
export interface FloorPlateRule {
  /** option1 = 최상층 전유 × ratio (기본) / option2 = 가정값 입력 엑셀 '증축층면적_옵션2' 값 (모델링 등) */
  method: 'option1' | 'option2'
  /** 옵션1 배율 */
  ratio: number
  /** 최상층에 층 지정 공용면적(계단실 등)이 없을 때, 지붕 표기에 이 글자가 있으면 평슬라브가 아님 → 증축 불가(계산 보류) */
  nonFlatRoofKeywords: string[]
}

/** 증축층 바닥면적 산정 결과 (lib/calc/floorPlate.ts) */
export interface FloorPlateResult {
  /** 증축층 바닥면적 (㎡). null = 계산 보류 (지붕이 평슬라브가 아님) */
  areaM2: number | null
  /** 실제로 쓴 방식 — buildingArea = 호별 면적 자료가 없어 건축면적 사용 */
  method: 'option1' | 'option2' | 'buildingArea'
  /** ok / blocked = 증축 불가(보류) / fallback = 자료 부족으로 건축면적 사용 */
  status: 'ok' | 'blocked' | 'fallback'
  /** 최상층 (층 번호가 있는 지상층 중 가장 높은 층) */
  topFloor: number | null
  /** 전유면적이 있는 가장 높은 층과 그 전유면적 (㎡) */
  netFloor: number | null
  netFloorNetM2: number | null
  /** 최상층에 층 지정 공용면적(계단실 등)이 있는지 */
  topFloorHasCommon: boolean
  /** 지붕 표기 */
  roofText: string
  /** 지붕 검사 결과 (검사하지 않았으면 null) */
  roofFlat: boolean | null
  detail: string
}

/** 전체 재건축 가정값 (lib/rules/baseRules.ts) */
export interface RebuildRule {
  /** 신축 전용률 (0~1) — 기준 엑셀 '빈땅_신축시나리오' 전유 80%·공용 20% 가정 */
  netRatio: number
  /** true면 1층을 필로티 주차로 두고 2층부터 주택 (주택 층수·용적률에서 1층 제외) */
  pilotiFloor1: boolean
  /** 건축 유형별 세대수 상한 (다가구 19세대, 건축법 시행령 별표1). 없으면 상한 없음 */
  maxHouseholds: Partial<Record<HousingType, number>>
}

/** 객체 안쪽까지 모두 선택 항목으로 만드는 도우미 타입 */
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** 관련 정부 정책 한 건 (lib/rules/policies.ts) */
export interface PolicyNote {
  id: string
  title: string
  /** 정책 내용 (원문 요약) */
  detail: string
  /** 출처 문서 */
  source: string
  /** 이 서비스에서 어떻게 반영했는지 */
  usage: string
}

/** 법규 시나리오 id (계산 엔진용 규칙 묶음). A·B·C는 ALL을 이루는 구성 요소로, 화면·보고서에는 보이지 않는다 */
export type ScenarioId = 'BASE' | 'A' | 'B' | 'C' | 'ALL'

/** 화면·보고서에서 고르는 시나리오: 현행 / 복합 완화(증축) / 복합 완화 + 전체 재건축 */
export type ViewScenarioId = 'BASE' | 'ALL' | 'REBUILD'

/** 화면·보고서 시나리오 (lib/rules/scenarios.ts → viewScenarios) */
export interface ViewScenario {
  id: ViewScenarioId
  name: string
  rationale: string
  /** true면 "프로젝트 가정" 배지 */
  isAssumption: boolean
  /** 계산에 쓰는 규칙 시나리오 */
  rulesId: ScenarioId
  /** expansion = 기존 건물 위 증축 / rebuild = 철거 후 신축 */
  kind: 'expansion' | 'rebuild'
}

/** 법규 완화 시나리오 */
export interface Scenario {
  id: ScenarioId
  /** 예: '일조 사선 완화' */
  name: string
  /** 근거 또는 가정 설명 (예: '노후 저층 주거지 수직증축 활성화 가정') */
  rationale: string
  /** true면 "프로젝트 가정" 배지 표시 (현행법이 아님) */
  isAssumption: boolean
  /** 바꿀 규칙값만 적는다 (BASE는 빈 객체) */
  overrides: DeepPartial<Rules>
}

/** 용적률·건폐율 계산 결과 (설계서 5-1, far.ts) */
export interface FarResult {
  /** 현재 용적률 (%) = 용적률산정 연면적 ÷ 대지면적 × 100 */
  currentFarPercent: number
  /** 적용 용적률 상한 (%) = rules.farLimitByZone[용도지역] (시나리오 적용 후) */
  farLimitPercent: number
  /** 허용 연면적 (㎡) = 대지면적 × 상한 ÷ 100 */
  maxGfaM2: number
  /** 잔여 연면적 (㎡, 0 이상) = 허용 연면적 − 현재 용적률산정 연면적 */
  remainingGfaM2: number
  /** 잔여 전용면적 (㎡) = 잔여 연면적 × 전용률 */
  remainingNetM2: number
}

/** 증축을 멈추게 한 조건 */
export type LimitingFactor = 'parking' | 'far' | 'housingArea' | 'housingFloors' | 'sunlight' | 'roof' | 'other'

/** 증축 산정 결과 (설계서 5-1 ~ 5-3) */
export interface ExpansionResult {
  /** 사용한 법규 시나리오 */
  scenarioId: ScenarioId
  /** 사용한 규칙 */
  rules: Rules
  /** 현재 용적률 (%) */
  currentFarPercent: number
  /** 적용 용적률 상한 (%) = 시나리오 적용 후 farLimitByZone[용도지역] */
  farLimitPercent: number
  /** 허용 연면적 (㎡) */
  maxFloorAreaM2: number
  /** 잔여 연면적 (㎡, 0 이상) */
  remainingFloorAreaM2: number
  /** 현재 건폐율 (%) */
  currentBcrPercent: number
  /** 일조권 허용 최고높이 (m). 일조 미적용이면 null */
  allowedHeightM: number | null
  /** 용적률 기준 증축 가능 층수 */
  floorsByFar: number
  /** 일조권 기준 증축 가능 층수 (미적용이면 null = 제한 없음) */
  floorsBySun: number | null
  /** 기타 제한 기준 증축 가능 층수 (없으면 null) */
  floorsByOther: number | null
  /** 최종 증축 층수 = 위 셋 중 최솟값 (0 이상) */
  addFloors: number
  /** 증축 연면적 (㎡) */
  addFloorAreaM2: number
  /** 증축 후 지상 층수 */
  newTotalFloors: number
  /** 증축 후 높이 (m) */
  newHeightM: number
  /** 증축 후 용적률 (%) */
  newFarPercent: number
  /** 제한요인 (최솟값을 만든 항목) */
  limitingFactor: LimitingFactor
  /** 근거 문장 (화면 "계산 근거 펼치기"와 보고서에 그대로 사용) */
  reasons: string[]
}

// ═════════════════════════════════════════════
// 4-4. 수익성 데이터 (설계서 5-4, 6-2)
// ═════════════════════════════════════════════

/** 건축주 정보 — 프로토타입은 가상값 */
export interface OwnerInfo {
  sampleId: SampleId
  /** 건축주 이름 (가상, 예: '김○○') */
  ownerName: string
  /** 현재 월 임대료 합계 (원) */
  monthlyRentWon: number
  /** 현재 보증금 합계 (원) */
  depositWon: number
  /** 현재 공실률 (소수) */
  vacancyRate: number
  /** 자기자본 투입 가능액 (원). 모르면 null → 대출비율 가정 사용 */
  availableEquityWon: number | null
  /** 가상 데이터임을 밝히는 메모 */
  note: string
}

/** 시장 데이터 — 프로토타입은 가상값 */
export interface MarketData {
  sampleId: SampleId
  /** 주변 ㎡당 월 임대료 (원/㎡·월) */
  rentPerM2Won: number
  /** 보증금 배수 (보증금 = 월 임대료 × 이 값) */
  depositMultiple: number
  /** 지역 공실률 (소수) */
  vacancyRate: number
  /** 시장 환원율 Cap rate (소수) */
  capRate: number
  /** 공사비 단가 지역 보정 배수 (1.0 = 기본) */
  unitCostFactor: number
  note: string
}

/** 수익성 계산 가정값 (financeDefaults + 시장데이터 + 사용자 입력을 합친 결과) */
export interface FinanceAssumptions {
  // ── 사업비 ──
  /** 증축 공사비 단가 (원/㎡) */
  unitCostWon: number
  /** 구조 보강비 (원) */
  structuralCostWon: number
  /** 승강기·설비비 (원) */
  equipmentCostWon: number
  /** 설계·감리비율 (공사비 대비, 소수) */
  designRate: number
  /** 인허가·부담금 (원) */
  permitCostWon: number
  /** 취득세 등 세율 (공사비 대비, 소수) */
  taxRate: number
  /** 공사 중 영업손실비율 (현재 월 임대료 대비, 소수) */
  constructionLossRate: number
  /** 예비비율 (소계 대비, 소수) */
  contingencyRate: number
  // ── 금융 ──
  /** 대출 비율 (소수) */
  loanRate: number
  /** 대출 금리 (연, 소수) */
  interestRate: number
  // ── 일정 ──
  /** 설계·인허가 기간 (개월) */
  designPermitMonths: number
  /** 공사 기간 (개월) */
  constructionMonths: number
  // ── 수익 ──
  /** 임대가능면적 비율 (증축 연면적 대비, 소수) */
  leasableRate: number
  /** ㎡당 월 임대료 (원/㎡·월) */
  rentPerM2Won: number
  /** 보증금 배수 (월 임대료 × 배수) */
  depositMultiple: number
  /** 보증금 전환이율 (연, 소수) */
  depositYieldRate: number
  /** 공실률 (소수) */
  vacancyRate: number
  /** 운영비율 (임대수입 대비, 소수) */
  opexRate: number
  /** 시장 환원율 (소수) */
  capRate: number
  /** 임대료 상승률 (연, 소수) */
  rentGrowthRate: number
  /** 할인율 (연, 소수) — NPV 계산 */
  discountRate: number
  /** 분석 기간 (년) — 기본 10 */
  analysisYears: number
}

/** 가정값 하나가 어디서 왔는지 (우선순위: 사용자 입력 > 샘플 시장데이터 > 기본 가정) */
export type AssumptionSource = 'user' | 'market' | 'default'

/** 수익 시나리오 id */
export type FinanceScenarioId = 'CONSERVATIVE' | 'BASE' | 'OPTIMISTIC'

/** 가정값 조정 한 건 (예: 임대료 ×0.9, 공실률 +0.05) */
export interface FinanceAdjustment {
  field: keyof FinanceAssumptions
  /** multiply = 곱하기, add = 더하기 */
  op: 'multiply' | 'add'
  value: number
}

/** 수익 시나리오 (보수 / 기준 / 낙관) */
export interface FinanceScenario {
  id: FinanceScenarioId
  name: string
  adjustments: FinanceAdjustment[]
}

/** 사업비 항목 한 줄 (보고서 4장 표에 그대로 사용) */
export interface CostItem {
  /** 항목 키 (예: 'construction') */
  key: string
  /** 항목 이름 (예: '공사비') */
  label: string
  /** 금액 (원) */
  amountWon: number
  /** 계산식 설명 (예: '660㎡ × 220만원 + 구조보강 + 설비') */
  formula: string
}

/** 10년 현금흐름 한 해 (P1) */
export interface CashflowYear {
  /** 연차 (1부터) */
  year: number
  /** 그 해 NOI 증가분 (원) */
  noiWon: number
  /** 그 해 이자 (원) */
  interestWon: number
  /** 그 해 순수익 = NOI − 이자 (원) */
  netWon: number
  /** "증축함" 누적 순수익 (원, 초기 자기자본 차감 후) */
  cumulativeWithWon: number
  /** "증축 안 함" 누적 순수익 (원, 기존 임대수익 기준) */
  cumulativeWithoutWon: number
  /** 자산가치를 더한 순자산 (원) — 함 / 안 함. 자산가치를 계산하지 못했으면 없음 */
  netWorthWithWon?: number
  netWorthWithoutWon?: number
}

/** 수익성 계산 결과 (설계서 5-4) */
export interface FinanceResult {
  /** ok = 정상 계산, notExpandable = 증축 0층이라 계산 생략 */
  status: 'ok' | 'notExpandable'
  /** 사용한 가정값 */
  assumptions: FinanceAssumptions
  // ── A. 사업비 ──
  costBreakdown: CostItem[]
  /** 총사업비 (원) */
  totalCostWon: number
  /** 자기자본 (원) */
  equityWon: number
  /** 대출액 (원) */
  loanWon: number
  // ── B. 수익 ──
  /** 연 임대수입 (원, 공실 반영) */
  annualRentWon: number
  /** 연 보증금 운용수익 (원) */
  depositIncomeWon: number
  /** 연 운영비 (원) */
  opexWon: number
  /** 연 NOI 증가 (원) */
  noiWon: number
  /** 연 이자 (원) */
  annualInterestWon: number
  // ── C. 지표 ──
  /** 단순 ROI (소수) = NOI ÷ 총사업비 */
  roiRate: number
  /** 자기자본수익률 ROE (소수) = (NOI − 이자) ÷ 자기자본 */
  roeRate: number
  /** 투자회수기간 (년). NOI가 0 이하이면 null */
  paybackYears: number | null
  /** 자산가치 증가 (원) = NOI ÷ 환원율 */
  valueIncreaseWon: number
  /** 순자산가치 증가 (원) = 자산가치 증가 − 총사업비 */
  netValueIncreaseWon: number
  // ── P1 ──
  cashflow: CashflowYear[]
  /** 순현재가치 (원). 미계산이면 null */
  npvWon: number | null
  /** 내부수익률 (소수). 계산 불가면 null */
  irrRate: number | null
  /** 근거 문장 */
  reasons: string[]
}

/** 민감도 분석 한 줄 (토네이도 차트 막대 하나, 설계서 5-5) */
export interface SensitivityItem {
  /** 변수 이름 (예: '공사비 단가') */
  label: string
  /** 변동폭 설명 (예: '±10%') */
  rangeLabel: string
  /** 변수가 불리하게 바뀔 때 ROI (소수) */
  lowRoiRate: number
  /** 변수가 유리하게 바뀔 때 ROI (소수) */
  highRoiRate: number
}

/** runAll 결과 — 화면과 보고서의 모든 숫자는 여기서만 가져온다 (설계서 5-6) */
export interface AnalysisResult {
  scenarioId: ScenarioId
  financeScenarioId: FinanceScenarioId
  /** 규모: 완화 전(BASE) / 완화 후(선택 시나리오) */
  expansion: { before: ExpansionResult; after: ExpansionResult }
  /** 규모: 법규 시나리오 4개 각각 (보고서 2장 비교표) */
  expansionByScenario: Record<ScenarioId, ExpansionResult>
  /** 수익: 완화 전 / 완화 후 */
  finance: { before: FinanceResult; after: FinanceResult }
  /** 보수/기준/낙관 각각의 완화 후 수익 */
  financeByScenario: Record<FinanceScenarioId, FinanceResult>
  /** 민감도 (완화 후 기준) */
  sensitivity: SensitivityItem[]
}

// ═════════════════════════════════════════════
// 보고서 (설계서 11장) — 세부 구조는 [6-1]에서 확정
// ═════════════════════════════════════════════

/** 핵심 숫자 카드 하나 */
export interface Kpi {
  label: string
  /** 표시용 문자열 (예: '+4층 · +660㎡') */
  value: string
  /** 보조 설명 (없으면 null) */
  caption: string | null
}

/** 리스크 한 건 (7장) */
export interface Risk {
  title: string
  level: '높음' | '중간' | '낮음'
  description: string
  /** 대응 방안 */
  mitigation: string
}

/** 추진 절차 한 단계 (8장) */
export interface ScheduleStep {
  name: string
  /** 시작 시점 (착수 후 개월) */
  startMonth: number
  /** 기간 (개월) */
  durationMonths: number
  /** 건축주가 결정해야 할 일 (없으면 null) */
  ownerDecision: string | null
  /** 이 단계의 비용 지출 (없으면 null) */
  costNote: string | null
}

/** 증축 계획안의 층 하나 (3장) */
export interface PlanFloor {
  /** 층 번호 */
  floor: number
  /** 바닥면적 (㎡) */
  areaM2: number
  /** 증축층이면 true */
  isAdded: boolean
  /** 용도 (기존 용도 또는 제안 용도) */
  use: string
}

/** 다음 단계 제안 한 단계 (10장) */
export interface NextStep {
  /** 단계 번호 (1부터) */
  step: number
  title: string
  description: string
}

/** 협업 전문가 (9장) */
export interface Partner {
  role: string
  task: string
  /** 투입 시점 (예: '기본설계 전') */
  timing: string
}

/** 보고서 전체 데이터 — 보고서 컴포넌트는 이것만 읽고 직접 계산하지 않는다 */
export interface ReportData {
  meta: {
    /** 예: '샘플로 12 건물 증축 사업 타당성 검토 보고서' */
    title: string
    address: string
    /** 작성일 (YYYY-MM-DD) */
    createdAt: string
    author: string
    scenarioName: string
    financeScenarioName: string
    source: DataSource
  }
  /** 증축 0층이면 true → 3~6장 대신 "대안 검토" 장 */
  notExpandable: boolean
  /** 0장: 표지 + 한 장 요약 */
  summary: {
    kpis: Kpi[]
    /** 한 문장 결론 */
    conclusion: string
    /** 추천 다음 단계 한 줄 */
    nextStep: string
    /** 3D 전/후 캡처 (PNG dataURL, 없으면 null → 3D 직접 렌더링) */
    images: { before: string; after: string } | null
  }
  /** 1장: 현황 */
  building: TargetBuilding
  /** 3장: 증축 계획안 */
  plan: {
    floors: PlanFloor[]
    /** 증축층 용도 제안 */
    useProposal: string
    /** 공사 방식 */
    constructionMethod: string
  }
  owner: OwnerInfo | null
  /** 2~6장: 계산 결과 (runAll 결과 그대로) */
  analysis: AnalysisResult
  /** 2장: 추가 확인 항목 */
  checkItems: string[]
  /** 7장 */
  risks: Risk[]
  /** 8장 */
  schedule: ScheduleStep[]
  /** 9장 */
  partners: Partner[]
  /** 10장 */
  nextSteps: NextStep[]
  /** 10장: 지금 결정할 한 가지 */
  decisionNow: string
  /** 부록: 가정값과 출처 */
  appendix: {
    /** 적용한 법규 시나리오 목록 (완화 가정 표) */
    scenarios: Scenario[]
    /** 수익 시나리오 정의 (보수/기준/낙관 조건) */
    financeScenarios: FinanceScenario[]
    assumptionSources: Partial<Record<keyof FinanceAssumptions, AssumptionSource>>
    /** 계산식 요약 */
    formulas: string[]
    /** 데이터 출처 */
    dataSources: string[]
    disclaimer: string
  }
}

// ═════════════════════════════════════════════
// 건축물대장 원본 레코드 (영등포구 실제 데이터 검색용)
// ═════════════════════════════════════════════

/** 건축물대장 표제부 한 건 (건물 한 동) */
export interface BuildingRecord {
  /** 관리건축물대장PK — 건물 한 동의 고유 id */
  id: string
  /** 필지 고유번호 19자리 */
  pnu: string
  /** 대지위치 (지번 주소) */
  address: string
  /** 도로명 대지위치 (없으면 null) */
  roadAddress: string | null
  buildingName: string | null
  /** 동 명칭 (예: 101동). 한 필지에 건물이 여러 동일 때 구분용 */
  dongName: string | null
  /** 대장 종류 (일반건축물 / 표제부) */
  registerType: string
  /** 대지면적 (㎡). 대장에 값이 없으면 null */
  siteAreaM2: number | null
  /** 건축면적 (㎡) */
  buildingAreaM2: number
  /** 건폐율 (%). 값이 없으면 null */
  bcrPercent: number | null
  /** 연면적 (㎡) */
  totalFloorAreaM2: number
  /** 용적률산정연면적 (㎡) */
  farFloorAreaM2: number
  /** 용적률 (%). 값이 없으면 null */
  farPercent: number | null
  /** 주용도 (주용도코드명) */
  mainUse: string
  /** 기타용도 */
  etcUse: string | null
  /** 세대수 */
  households: number
  /** 높이 (m). 값이 없으면 null */
  heightM: number | null
  floorsAbove: number
  floorsBelow: number
  /** 사용승인일 (YYYY-MM-DD). 값이 없으면 null */
  approvalDate: string | null
}

/** 주소 검색 결과 후보 (필지 단위) */
export interface SiteCandidate {
  pnu: string
  address: string
  roadAddress: string | null
  /** 이 필지에 있는 건물 동 수 */
  buildingCount: number
}

/** 첫 화면의 예시 주소 버튼 */
export interface ExampleAddress {
  label: string
  pnu: string
  note: string
  /** 카드 일러스트용 지상 층수 */
  floorsAbove: number
  /** 카드 위 강조 표시 (예: '우선 분석 · 기준 엑셀'). 없으면 표시 안 함 */
  tag?: string
}

/** 증축 가능 여부 판정 — pending: 계산 엔진 연결 전(판정 대기) / conditional: 주차 추가 확보 시 가능 /
 *  check: 주택 층수 한도 등으로 대안 확인 필요 */
export interface Expandability {
  status: 'pending' | 'possible' | 'conditional' | 'check' | 'impossible'
  /** 화면에 보여줄 설명 */
  reason: string
}

// ═════════════════════════════════════════════
// 기준 엑셀 데이터 (lib/data/*.json, scripts/build-excel-data.mjs 로 생성 — 설계서 12-1)
// ═════════════════════════════════════════════

/** 건축물대장_2단계 + 지역지구구역_2단계 한 동 */
export interface ExcelSite {
  id: string
  pnu: string
  address: string
  roadAddress: string | null
  buildingName: string | null
  dongName: string | null
  registerType: string
  /** 외필지수 — 1보다 크면 대지 범위 확인 필요 */
  outsideParcels: number
  zone: ZoneName | null
  zones: string[]
  siteAreaM2: number | null
  buildingAreaM2: number
  bcrPercent: number | null
  totalFloorAreaM2: number
  farFloorAreaM2: number
  farPercent: number | null
  structure: string
  mainUse: string
  etcUse: string | null
  households: number
  /** 가구수 — 다가구주택 판별·가구별 면적 계산에 사용 */
  families: number
  unitCount: number
  heightM: number | null
  floorsAbove: number
  floorsBelow: number
  elevators: { passenger: number; emergency: number }
  /** 실제 주차대수 (대) */
  parking: { indoorMechanical: number; outdoorMechanical: number; indoorSelf: number; outdoorSelf: number; total: number }
  approvalDate: string | null
  seismic: { applied: boolean; capacity: string | null }
  /** 지붕 (건축물대장 지붕코드명 / 기타지붕) — 증축층 바닥면적 옵션1의 증축 가능 판단 */
  roof: { type: string | null; etc: string | null }
}

/** 전유공용면적_2단계 한 줄 */
export interface ExcelUnitArea {
  kind: '전유' | '공용'
  floorType: string | null
  floor: number | null
  floorLabel: string | null
  use: string
  etcUse: string | null
  areaM2: number
}

/** 주차대수_세대별 한 줄 */
export interface ExcelUnitParking {
  mainUse: string
  netAreaM2: number | null
  facilityAreaM2: number | null
  /** 예: '제5호(공동주택·오피스텔)', '제3호(근생 134㎡)', '제2-1호(일반업무 100㎡)', '제4호(단독)' */
  basis: string
  perUnitSpaces: number | null
  housingActSpaces: number | null
  neighborhoodSpaces: number | null
  officeSpaces: number | null
}

/** 호 하나 (면적 + 주차 산정) */
export interface ExcelUnit {
  pnu: string
  unitName: string
  mainUse: string
  etcUse: string | null
  areas: ExcelUnitArea[]
  parking: ExcelUnitParking | null
}

/** 용적률완화_주차검토 한 행 — 엑셀 대조 테스트의 정답 */
export interface ParkingReviewRow {
  pnu: string
  address: string
  buildingName: string | null
  zone: string
  category: string
  mainUse: string
  etcUse: string | null
  households: number | null
  siteAreaM2: number | null
  baseFarPercent: number | null
  relaxedFarPercent: number | null
  farFloorAreaM2: number | null
  relaxedMaxGfaM2: number | null
  addableGfaM2: number | null
  netRatio: number | null
  addableNetM2: number | null
  actualParking: number | null
  required: { perUnit: number | null; housingAct: number | null; detached: number | null; neighborhood: number | null; office: number | null }
  requiredParking: number | null
  spareParking: number | null
  maxAddUnits: number | null
  maxNetPerUnitM2: number | null
  addedRequired: number | null
  requiredAfter: number | null
  needFor1Unit: number | null
  maxAreaUnits: number | null
  needForMaxArea: number | null
  verdict: string | null
  note: string | null
}

// ═════════════════════════════════════════════
// 주차·주택 한도 계산 결과 (설계서 5-3a, 5-3b)
// ═════════════════════════════════════════════

/** 주차 산정용 호 — 용도 그룹과 면적만 남긴 형태 */
export interface ParkingUnit {
  /** housing5 = 제5호 주택(세대기준), detached = 제4호 단독·다중, neighborhood = 제3호 근생, office = 제2-1호 업무 */
  use: 'housing5' | 'detached' | 'neighborhood' | 'office'
  /** 전용면적 (㎡) */
  netAreaM2: number
  /** 시설면적 (㎡) — 공용 포함, 주차시설 제외 */
  facilityAreaM2: number
}

/** 추가 세대 유형: S 전용 30㎡ 이하 / M 60㎡ 이하 / L 60㎡ 초과 */
export type AddUnitType = 'S' | 'M' | 'L'

export interface AddUnit {
  type: AddUnitType
  /** 전용면적 (㎡) */
  netAreaM2: number
  /** 이 세대에 필요한 주차 (대) */
  spaces: number
}

/** 주차 여유로 넣을 수 있는 추가 세대 묶음 */
export interface AddUnitPlan {
  units: AddUnit[]
  /** 추가 전용면적 합 (㎡) */
  netM2: number
  /** 증가 법정대수 (대) */
  spaces: number
  /** 주차 기준 최대 연면적 (㎡) = 추가 전용 ÷ 전용률 */
  gfaM2: number
}

export interface ParkingResult {
  /** 현재 법정대수 내역 (대) */
  required: {
    perUnit: number
    housingAct: number
    /** 제5호 = max(세대기준, 주택법) */
    housing: number
    detached: number
    neighborhood: number
    office: number
    total: number
    /** true면 복합용도 → 비주택 용도별 소수 절사 (비고4) */
    mixedUse: boolean
  }
  /** 실제 주차대수 (대) */
  actual: number
  /** 기존 여유대수 = 실제 − 법정 (음수면 이미 부족) */
  spare: number
  /** 기존 주차 여유 안에서 전용면적이 최대가 되는 추가 세대 */
  plan: AddUnitPlan
  /** 엑셀 방식(추가 세대 전용 15~30㎡) 재현값 — 엑셀 대조용 */
  excel: {
    maxAddUnits: number | null
    needFor1Unit: number | null
    maxAreaUnits: number | null
    needForMaxArea: number | null
  }
  /** 기존 여유로 0세대일 때: 주차를 addSpaces대 추가 확보한 안 */
  option: (AddUnitPlan & { addSpaces: number; spareAfter: number }) | null
  reasons: string[]
}

/** 주택 층수·연면적 현황 */
export interface HousingSummary {
  /** null = 다세대·다가구·다중주택이 아님 → 한도 미적용 */
  housingType: HousingType | null
  /** 주택으로 쓰는 지상 층 수 */
  housingFloors: number
  /** 주택 전유 + 공용 면적 (㎡) */
  housingAreaM2: number
  /** 'units' = 호별 면적 합산, 'register' = 호별 자료가 없어 대장 값으로 추정 */
  source: 'units' | 'register'
}

export interface HousingLimitResult {
  applies: boolean
  floorLimit: number | null
  areaLimitM2: number | null
  housingFloorsAfter: number
  floorOK: boolean
  /** 주택 연면적 한도로 남은 면적 (㎡). null = 미적용 */
  areaGfaM2: number | null
  reasons: string[]
}

// ═════════════════════════════════════════════
// 증축 산정 v3 — 주차 기준 최대 연면적 (설계서 5-3)
// ═════════════════════════════════════════════

/** 기준 엑셀에 없어 수기 입력하는 값 (lib/data/siteInputs.json) */
export interface SiteInput {
  pnu: string
  /** 정북 인접대지 경계까지 이격거리 (m). null = 확인 필요 */
  northSetbackM: number | null
  /** 1층이 필로티(주차 전용)인지 */
  pilotiFloor1: boolean
  /**
   * 대지를 이루는 필지 PNU 목록 (대표 필지 포함). 토지가액 = Σ(필지 면적 × 공시지가).
   * 없으면(null) 외필지수 0일 때 대표 필지 하나로 보고, 외필지가 있으면 '추정'으로 계산한다.
   */
  lots?: string[] | null
  /** 증축계획안 증축 연면적 엑셀(inputs/plannedGfa.json)에서 이 필지 값을 찾는 PNU (엑셀 PNU가 본번 단위로 적혀 있어 직접 연결) */
  plannedGfaPnu?: string | null
  source: '수기입력' | '확인필요'
}

/** 검토 항목별 판정 — pass 통과 / fail 불가 / check 확인 필요(자료 없음) */
export interface ExpansionCheck {
  item: 'parking' | 'far' | 'housingArea' | 'housingFloors' | 'sunlight' | 'floorPlate'
  status: 'pass' | 'fail' | 'check'
  /** 한 줄 설명 */
  detail: string
}

/** 한 가지 주차 조건(기존 주차 또는 추가 확보)에서의 증축 규모 */
export interface ExpansionPlan {
  /** 추가 세대 */
  addUnits: AddUnit[]
  /** 추가 전용면적 (㎡) */
  addNetM2: number
  /** 증축 연면적 (㎡) = min(주차 기준, 용적률 잔여, 주택 연면적 잔여) 후 층수·일조 검토 */
  addGfaM2: number
  addFloors: number
  newTotalFloors: number
  /** 증축 후 높이 (m). 현재 높이를 모르면 null */
  newHeightM: number | null
  newFarPercent: number
  /** 증축 규모를 결정한(또는 0으로 만든) 항목 */
  limitingFactor: LimitingFactor
  /** 주택 층수 검토 전에 필요했던 증축 층수 (연면적 ÷ 증축층 바닥면적) */
  attemptedFloors: number
  /** 측면 보강부 연면적 (㎡) — addGfaM2 에 포함됨. 없으면 0 */
  sideGfaM2: number
  /** 측면 보강부 전용면적 (㎡) = 연면적 × 전용률. 새 세대가 아니라 기존 세대 확장분이라 addUnits 에는 없다 */
  sideNetM2: number
  /** 증축 후 주택 층수 (실제 증축 층수 기준, 주택이 아니거나 증축이 없으면 null) */
  housingFloorsAfter: number | null
  /** 종합 판정 — possible 증축 가능 / impossible 불가 / check 확인 필요(주택 층수 한도로 신규 층 주택만 불가, 대안 검토) */
  verdict: 'possible' | 'impossible' | 'check'
  checks: ExpansionCheck[]
  reasons: string[]
}

/** 증축 산정 결과 (lib/calc/expansion.ts) */
export interface SiteExpansionResult {
  scenarioId: ScenarioId
  /** 이 시나리오에서 적용한 규칙 (화면·보고서의 현행→완화 표에 그대로 사용) */
  rules: Rules
  /** 이 건물에 실제 적용한 일조 규칙 (다가구·다세대면 수직 허용 높이 반영) */
  sunlight: SunlightRule
  /** 전용률 (0~1, 기준 엑셀) */
  netRatio: number
  far: FarResult
  parking: ParkingResult
  housing: HousingSummary & { limit: HousingLimitResult }
  /** 일조 허용 최고높이 (m). null = 미적용 또는 이격거리 확인 필요 */
  allowedHeightM: number | null
  /** 1개층 증축(현재 높이 + 층고) 시 필요한 정북 이격거리 (m). 일조 미적용·높이 없음이면 null */
  requiredSetbackM: number | null
  /** 증축층 바닥면적 상한 (㎡)과 출처 */
  floorPlate: FloorPlateResult
  /** 옥탑세대 기준 주차 세대 조합 (연면적 = 전용, 세대당 최소 14㎡) — 화면·보고서 '주차 기준 최대 연면적' 표시용. parking.plan 은 기준 엑셀 대조용 */
  rooftop: AddUnitPlan
  /** 옥탑세대 기준, 주차 추가 확보 안 (0세대일 때) */
  rooftopOption: (AddUnitPlan & { addSpaces: number; spareAfter: number }) | null
  /** 기존 주차로 가능한 증축 */
  plan: ExpansionPlan
  /** 기존 주차로 0세대일 때: 주차 addSpaces대 추가 확보 시 증축 */
  parkingOption: (ExpansionPlan & { addSpaces: number }) | null
}

/** 기준 엑셀에서 모은 한 필지 묶음 — runAll 입력 (설계서 5-6) */
export interface SiteData {
  pnu: string
  /** 대표 동 (한 필지에 동이 여러 개면 첫 동) */
  site: ExcelSite
  /** 이 필지의 호 목록 */
  units: ExcelUnit[]
  /** 기준 엑셀 '용적률완화_주차검토' 행 (전용률 출처) */
  review: ParkingReviewRow
  /** 수기 입력값 (없으면 null) */
  siteInput: SiteInput | null
  /** 화면·보고서 출처 표기 (예: '기준 엑셀(261007-a · 2026-10-07)') */
  sourceLabel: string
  /** 기준 엑셀 파일 이름·버전·기준일 (lib/data/source.json → 변환 JSON의 meta) */
  source: { file: string; version: string; date: string }
  /** 기준 엑셀 '용적률완화_주차검토' 시트 하단의 산정 근거·가정 문장 */
  excelNotes: string[]
  /** 대표 필지 + 구성 필지의 개별공시지가 (기준 엑셀 '개별공시지가_2단계' → landPrice.json) */
  landPrices: LandPriceRow[]
  /** 대표 필지 + 구성 필지의 토지대장 (기준 엑셀 '토지임야목록_2단계' → landLots.json) */
  landLots: LandLotRow[]
  /** 수익성 가정값 (가정값 입력 엑셀 '가정값' → inputs/assumptions.json) */
  assumptionRows: AssumptionRow[]
  /** '가정값' 시트의 메모 줄 (예: 층별 공사비 단가 안내) — 보고서 4장·부록에 표시 */
  assumptionNotes: string[]
  /** 임대 사례 (가정값 입력 엑셀 '임대사례' → inputs/rentComps.json) */
  rentComps: RentComp[]
  /** 기준 엑셀 '하우빌드 공사비' (없으면 빈 배열) */
  constructionCosts?: ConstructionCostRow[]
  /** 증축층 바닥면적 옵션2 값 (가정값 입력 엑셀 '증축층면적_옵션2' → inputs/floorPlate.json). 없으면 null */
  floorPlateOption2M2: number | null
  /** 3D 모델(lib/data/massAreas.json)에서 추출한 측면 보강부(SIDE) 평면 면적 합 (㎡). 모델에 없으면 null */
  massSideAreaM2: number | null
  /** 증축계획안 엑셀의 증축 가능 연면적 (㎡, inputs/plannedGfa.json). 일조 완화 시나리오(A·ALL)의 증축 연면적으로 적용. 없으면 null */
  plannedGfaM2?: number | null
}

/** 전체 재건축 산정 결과 (lib/calc/rebuild.ts) — 기존 건물 철거 후 같은 대지에 신축 */
export interface RebuildResult {
  /** 사용한 규칙 시나리오 (ALL) */
  rulesId: ScenarioId
  rules: Rules
  /** 신축 건축 유형 (기존 건물 유형, 주택이 아니면 다세대로 가정) */
  housingType: HousingType
  /** 대지면적 (㎡, 건축물대장) */
  siteAreaM2: number
  /** 건폐율 상한 (%) — 서울시 조례 (zoningTable) */
  bcrLimitPercent: number
  /** 최대 건축면적 (㎡) = 대지 × 건폐율 = 신축 기준층 바닥면적 */
  maxBuildingAreaM2: number
  farLimitPercent: number
  /** 용적률 한도 연면적 (㎡) = 대지 × 용적률 상한 */
  farGfaM2: number
  /** 주택 층수 한도 (개층) */
  floorLimit: number
  /** 층수 한도 연면적 (㎡) = 최대 건축면적 × 주택 층수 한도 */
  floorsGfaM2: number
  /** 주택 연면적 한도 (㎡, '미만'이면 0.01㎡ 뺀 값) */
  housingAreaGfaM2: number
  /** 신축 연면적 (㎡, 용적률 산정 기준 — 필로티 주차 제외) = 위 셋 중 최솟값 (일조 이격이 입력되면 높이로 축소) */
  gfaM2: number
  limitingFactor: LimitingFactor
  /** 전용률 (rules.rebuild.netRatio) */
  netRatio: number
  /** 전용면적 합 (㎡) */
  netM2: number
  /** 세대수 = 내림(전용 합 ÷ 최소 세대 전용), 유형별 상한 적용 */
  households: number
  /** 세대당 전용 (㎡) */
  netPerUnitM2: number
  /** 주택 층수 */
  housingFloors: number
  /** 지상 층수 (필로티 포함) */
  totalFloors: number
  /** 높이 (m) = 지상 층수 × 층고 (가정) */
  heightM: number
  /** 신축 용적률 (%) */
  farPercent: number
  /** 법정 주차 (대) — 세대기준·주택법 기준 중 큰 값 */
  parking: { perUnit: number; housingAct: number; required: number; currentActual: number }
  /** 기존 건물 연면적·세대수 (비교용) */
  existing: { gfaM2: number; households: number; floorsAbove: number }
  /** 신축 높이에 필요한 정북 이격 (m). 일조 미적용이면 null */
  requiredSetbackM: number | null
  /** 입력된 이격거리 기준 허용 높이 (m). 미입력·미적용이면 null */
  allowedHeightM: number | null
  verdict: 'possible' | 'impossible' | 'check'
  checks: ExpansionCheck[]
  reasons: string[]
}

/** runAll 결과 — 화면·보고서는 이 값만 쓴다 */
export interface SiteAnalysis {
  pnu: string
  /** 선택한 화면 시나리오 (BASE / ALL / REBUILD) */
  scenarioId: ViewScenarioId
  /** 규칙 시나리오별 증축 산정 결과 (A·B·C 포함 — 엑셀 대조·현행→완화 표에 사용) */
  byScenario: Record<ScenarioId, SiteExpansionResult>
  /** 선택 시나리오의 규칙으로 계산한 증축 결과 (REBUILD는 같은 규칙인 ALL) */
  selected: SiteExpansionResult
  /** 전체 재건축 결과 (ALL 규칙, 시나리오 선택과 무관하게 항상 계산) */
  rebuild: RebuildResult
  /** 토지가액 (공시지가 기준, 시나리오와 무관) */
  land: LandValueResult
  /** 선택 시나리오의 증축 전·후 자산가치 (원가 기준, 참고) */
  asset: AssetValueResult
  /** 수익성 (임대 모델) — 수익 시나리오 보수·기준·낙관 (결정 1·6) */
  finance: {
    selected: FinanceScenarioId
    byScenario: Record<FinanceScenarioId, SiteFinanceResult>
    /** 6장 민감도 (기준 시나리오 중심, 수익성을 계산하지 못했으면 null) */
    sensitivity: SiteSensitivityResult | null
    /** 공사비 실적 요약 (기준 엑셀 '하우빌드 공사비') */
    construction: ConstructionCostSummary
    /** 재건축 신축 단가에 적용한 지상 N층 공사면적 기준 평당 공사비 (실적이 없으면 null) */
    floorWorkCost: FloorWorkCostStat | null
    /** 층수별 공사면적 기준 평당 공사비 표 (엑셀 '하우빌드 2026환산' 4장 층수별 표와 같은 값, 층수 오름차순) */
    floorWorkCostTable: FloorWorkCostStat[]
    /** 자산가치 연차별 경로에 쓴 상승률과 근거 */
    assetGrowth: AssetGrowthBasis
    /** 공사 기간: 층수별·연면적대별 실적 표와 이 사업의 추정 (층별·면적별 실적으로 갈음) */
    duration: { tables: ConstructionDurationSummary; estimate: DurationEstimate | null }
  }
}

// ═════════════════════════════════════════════
// 토지가액·자산가치 (설계서 5-4 [0], [C'])
// ═════════════════════════════════════════════

/** 개별공시지가 한 필지 (lib/data/landPrice.json) */
export interface LandPriceRow {
  pnu: string
  /** 개별공시지가 (원/㎡) — 시세 아님 */
  pricePerM2: number
  /** 기준연도 (예: '2026') */
  baseYear: string
  /** 기준월 (예: '01') */
  baseMonth: string | null
  /** 공시일 (예: '2026-04-30') */
  announcedDate: string
}

/** 토지대장 한 필지 (lib/data/landLots.json) */
export interface LandLotRow {
  pnu: string
  /** 지목 (예: '대') */
  landCategory: string
  /** 토지대장 면적 (㎡) */
  lotAreaM2: number
  /** 소유구분 (예: '개인') */
  ownership: string | null
}

/**
 * 토지가액 산정 방식
 * sum = 구성 필지 Σ(면적 × 공시지가), 면적 합이 대장 대지면적과 일치
 * mismatch = 구성 필지 Σ로 계산했지만 면적 합 ≠ 대장 대지면적 → '면적 확인 필요'
 * estimated = 외필지 자료 없음 → 대표 필지 공시지가 × 대장 대지면적 → '추정'
 * none = 공시지가 또는 대지면적이 없어 계산 불가
 */
export type LandValueBasis = 'sum' | 'mismatch' | 'estimated' | 'none'

/** 토지가액 계산에 쓴 필지 한 줄 */
export interface LandValueLot {
  pnu: string
  /** 계산에 쓴 면적 (㎡) — sum·mismatch는 토지대장 면적, estimated는 대장 대지면적 */
  areaM2: number
  pricePerM2: number
  valueWon: number
}

/** 토지가액 결과 (공시지가 기준, 시세 아님) */
export interface LandValueResult {
  basis: LandValueBasis
  /** 토지가액 (원). basis = none 이면 null */
  valueWon: number | null
  lots: LandValueLot[]
  /** 계산에 쓴 면적 합 (㎡) */
  areaUsedM2: number
  /** 건축물대장 대지면적 (㎡) */
  siteAreaM2: number | null
  /** 면적 차이 = 계산 면적 − 대장 대지면적 (㎡) */
  areaDiffM2: number | null
  /** 공시 기준 (대표 필지) */
  priceBasis: { baseYear: string; baseMonth: string | null; announcedDate: string } | null
  /** 근거 문장 */
  reasons: string[]
}

/** 증축 전·후 자산가치 (원가 기준 참고값 = 토지가액 + 건물가치) */
export interface AssetValueResult {
  land: LandValueResult
  existingBuilding: {
    /** 연면적 (㎡) */
    gfaM2: number
    /** 필로티 면적 (㎡) — 1층 필로티 가정이면 건축면적, 아니면 0 */
    pilotiAreaM2: number
    /** 공사 연면적 = 연면적 + 필로티 (㎡) — 단가표 '실공사면적' 기준 */
    constructionAreaM2: number
    /** 신축 단가 (원/㎡) — 건물신축단가표 용도별 평균 (가정값 입력 엑셀). 없으면 null */
    unitCostWon: number | null
    /** 경과연수 (년, 기준일까지 만 연수). 사용승인일 없으면 null */
    ageYears: number | null
    /** 연 감가율 (소수) */
    depreciationRatePerYear: number
    /** 잔가율 (소수) = max(최저잔가율, exp(−연 감가율 × 경과연수)) */
    residualRate: number
    /** 재조달원가 = 공사 연면적 × 신축 단가 (원, 감가 전). 단가가 없으면 null */
    replacementCostWon: number | null
    valueWon: number
  }
  addBuilding: {
    /** 증축 연면적 (㎡) — 선택 시나리오에서 채택된 증축안, 없으면 0 */
    gfaM2: number
    /** 증축·신축 건물가치 (원) = 해당 공사의 공사비 전액 (공사비를 계산하지 못했으면 연면적 × 신축 단가) */
    valueWon: number
    /** 건물가치 산정 근거 */
    basis: 'construction' | 'unitCost' | 'none'
  }
  /** 증축 전 자산가치 (원). 토지가액이 없으면 null */
  beforeWon: number | null
  /** 증축 후 자산가치 (원). 토지가액이 없으면 null */
  afterWon: number | null
  /** true면 기존 건물을 철거하고 신축 (재건축) — 후 자산가치에서 기존 건물가치를 뺀다 */
  demolished: boolean
  /** 기준일 (경과연수 계산) */
  baseDate: string
  reasons: string[]
}

/** 토지 포함(보유 자산 전체) 수익률 — NOI는 수익성 엔진에서 받는다 */
export interface LandInclusiveYield {
  /** 증축 전 = 기존 NOI ÷ 자산가치(전) */
  beforeRate: number
  /** 증축 후 = (기존 NOI + NOI 증가) ÷ (자산가치(전) + 총사업비) */
  afterRate: number
}

// ═════════════════════════════════════════════
// 기준 엑셀 필지 보고서 (lib/report/buildSiteReport.ts → components/report/site/*)
// ═════════════════════════════════════════════

/** 보고서 표 한 줄 (모든 칸은 표시용 문자열) */
export type ReportRow = string[]

/** 층별 용도·면적 한 줄 (1장) */
export interface FloorUseRow {
  /** 예: '3층', '지하1층' */
  floorLabel: string
  /** 예: '다중주택', '사무소' */
  uses: string
  /** 예: '301' 또는 '201~205 (5호)' */
  units: string
  /** 전유면적 합 (㎡) */
  netM2: number
  /** 그 층의 공용면적 합 (㎡) */
  commonM2: number
}

/** 3장 증축 계획안 (증축안이 없으면 alternatives 로 대체) */
export interface SitePlanSection {
  /** 'existing' 기존 주차로 가능 / 'parkingOption' 주차 추가 확보 조건 / 'rebuild' 전체 재건축 / 'none' 증축안 없음 */
  kind: 'existing' | 'parkingOption' | 'rebuild' | 'none'
  /** 계획안 제목 (예: '주차 1대 추가 확보 조건 증축안') */
  heading: string
  /** 증축안 (kind = none·rebuild 이면 null) */
  plan: ExpansionPlan | null
  /** 재건축안 (kind = rebuild 일 때) */
  rebuild: RebuildResult | null
  /** 주차 추가 대수 (kind = parkingOption 일 때) */
  addSpaces: number | null
  /** 증축안이 없을 때 대안 검토 문장 */
  alternatives: string[]
}

/** 1장 토지가액 (공시지가 기준) */
export interface SiteLandSection {
  /** 배지 문구: '공시지가 기준' | '면적 확인 필요' | '추정' | '계산 불가' */
  badge: string
  tone: 'accent' | 'danger' | 'neutral'
  /** 예: '10.6억원' */
  valueText: string
  /** 예: '1,062,372,000원' */
  exactText: string
  /** 예: '개별공시지가 기준 (시세 아님) · 2026년 1월 1일 기준 · 2026-04-30 공시' */
  basisNote: string
  /** [필지, 면적, 공시지가, 금액] */
  rows: ReportRow[]
  notes: string[]
}

/** 5장 수익 분석 — 증축 전·후 자산가치 (원가 기준 참고) */
export interface SiteAssetSection {
  /** 5장 핵심 숫자 (토지가액, 자산가치 전·후, 증가) */
  kpis: Kpi[]
  /** [항목, 증축 전, 증축 후, 근거] */
  rows: ReportRow[]
  /** 토지 포함 수익률 안내 */
  yieldNote: string
  notes: string[]
}

export interface SiteReport {
  meta: {
    title: string
    /** 표지·머리글 주소 (도로명 우선) */
    address: string
    jibunAddress: string
    createdAt: string
    scenarioId: ViewScenarioId
    /** 예: 'ALL 복합 완화 (프로젝트 가정)' */
    scenarioLabel: string
    /** 바닥글 출처 문구 */
    sourceLabel: string
  }
  /** 0장 표지 */
  summary: { kpis: Kpi[]; conclusion: string; addFloors: number; floorsAbove: number }
  /** 1장 현황 */
  status: {
    infoRows: { label: string; value: string }[]
    floorUses: FloorUseRow[]
    /** 층이 정해지지 않은 공용면적 (계단실 등 '각층') ㎡ */
    sharedCommonM2: number
    stats: Kpi[]
    notes: string[]
    /** 토지가액 (공시지가 기준) */
    land: SiteLandSection
  }
  /** 2장 법규 검토 */
  regulation: {
    relaxRows: ReportRow[]
    parkingRows: ReportRow[]
    parkingNote: string
    scenarioRows: ReportRow[]
    /** scenarioRows 중 선택 시나리오 행 번호 */
    selectedRow: number
    sunlight: string[]
    checkItems: string[]
  }
  /** 3장 증축 계획안 */
  plan: SitePlanSection
  /** 5장 수익 분석 — 자산가치 (토지가액·건물가치) */
  asset: SiteAssetSection
  /** 4장 사업비 · 5장 임대수익·지표 (lib/report/financeSection.ts) */
  finance: SiteFinanceSection
  /** 6장 시나리오·민감도 (lib/report/scenarioSection.ts) */
  scenario: SiteScenarioSection
  /** 7장 리스크와 대응 (lib/report/risks.ts) */
  risk: SiteRiskSection
  /** 8장 추진 절차·일정 (lib/report/schedule.ts) */
  schedule: SiteScheduleSection
  /** 9장 전문가 협업 구성 (lib/report/partners.ts) */
  partners: SitePartner[]
  /** 10장 다음 단계 제안 (lib/report/nextStep.ts) */
  nextStep: SiteNextStepSection
  /** 데이터 검증: 기준 엑셀 대조 + 추가로 확인·수정할 데이터 */
  verification: {
    /** [항목, 엑셀값, 계산값, 결과] */
    parityRows: ReportRow[]
    allMatch: boolean
    parityNote: string
    /** [데이터, 현재 값, 상태, 수정 위치] */
    todoRows: ReportRow[]
  }
  /** 부록: 근거·가정·출처 */
  appendix: {
    scenarioRows: ReportRow[]
    ruleRows: ReportRow[]
    /** [항목, 시트(또는 파일), 비고] */
    sourceRows: ReportRow[]
    /** [정책, 내용, 반영 방식] */
    policyRows: ReportRow[]
    policySource: string
    sourceFile: string
    excelNotes: string[]
    formulas: string[]
    disclaimer: string[]
    /** 수익성 가정값 표 [항목, 적용값(기준), 범위(보수 ~ 낙관), 등급, 출처] — 결정 4: 등급 C도 범위와 함께 출력 */
    assumptionRows: ReportRow[]
    /** 전월세 전환율 표 [구분, 법정 상한, 시장, 보수, 기준, 근거] */
    conversionRows: ReportRow[]
    /** 가정값 입력 엑셀 메모 */
    assumptionNotes: string[]
  }
  analysis: SiteAnalysis
}

/** 8장 추진 절차·일정 — 단계·기간은 lib/rules/projectSchedule.ts (프로젝트 가정) */
export interface SiteScheduleSection {
  status: 'ok' | 'none'
  statusText: string | null
  steps: ScheduleStep[]
  /** 전체 기간 (개월) */
  totalMonths: number
  /** 층별·면적별 공사 기간 실적 — [구분, 사례, 중위, 빠름(25%) ~ 느림(75%)] 표 (공사 단계 기간의 근거) */
  durationFloorRows: ReportRow[]
  durationAreaRows: ReportRow[]
  /** 이 사업에 적용한 공사 기간 설명 (예: '하우빌드 실적 지상 5~7층 … 중앙값 8.5개월') */
  durationNote: string
  notes: string[]
}

/** 9장 협업 전문가 한 분야 */
export interface SitePartner extends Partner {
  /** 이 보고서에서 그 전문가가 확인해야 하는 항목 */
  focus: string
}

/** 10장 다음 단계 제안 */
export interface SiteNextStepSection {
  steps: NextStep[]
  /** 지금 결정할 한 가지 */
  decisionNow: string
  /** 정밀 검토 전에 확인할 항목 (위험도 중간 이상) */
  checklist: string[]
}

/** 7장 리스크와 대응 — 규칙 기반 (lib/report/risks.ts) */
export interface SiteRiskSection {
  /** 위험도 높은 순 */
  items: Risk[]
  summary: string
  /** 위험도 판단 기준 문장 */
  rules: string[]
}

/** 기준 엑셀 '하우빌드 공사비' 한 현장 (lib/data/construction.json) — 저층 주택 신축 도급 공사비, 건설공사비지수 2026 환산 */
export interface ConstructionCostRow {
  id: string | null
  name: string | null
  region: string | null
  use: string | null
  floorsText: string | null
  gfaM2: number | null
  workAreaM2: number | null
  startYear: number | null
  /** 공사 기간 (개월) */
  months: number | null
  /** 최종 공사비 (원, VAT 포함, 환산 전) */
  finalCostWon: number | null
  /** 'Y'면 통계에서 제외 (중복 의심 등) */
  excluded: string | null
  indexFactor: number | null
  /** ㎡당 공사비 (연면적 기준, 2026 환산, 원) */
  perM2Gfa2026Won: number | null
  /** 평당 공사비 (공사면적 기준, 2026 환산, 만원) */
  pyeongWork2026Manwon: number | null
}

/** 공사비 실적 한 집단의 통계 */
export interface ConstructionStat {
  label: string
  count: number
  /** ㎡당 공사비 (연면적 기준, 2026 환산) 중앙값 · 보수(상위 사분위) · 낙관(하위 사분위), 원 */
  perM2Median: number | null
  perM2Conservative: number | null
  perM2Optimistic: number | null
  /** 연면적 기준 평당 중앙값 (만원) = ㎡당 × 3.305785 ÷ 1만 */
  pyeongGfaMedianManwon: number | null
  /** 공사면적 기준 평당 중앙값 (만원) */
  pyeongWorkMedianManwon: number | null
  /** 공사 기간 중앙값 (개월) */
  monthsMedian: number | null
}

/** 공사 기간 한 집단의 통계 (개월) */
export interface DurationStat {
  label: string
  count: number
  /** 중앙값 · 하위(빠름) 사분위 · 상위(느림) 사분위 */
  median: number | null
  p25: number | null
  p75: number | null
}

/** 층수별·연면적대별 공사 기간 (하우빌드 실적) */
export interface ConstructionDurationSummary {
  byFloors: DurationStat[]
  byArea: DurationStat[]
  /** 층당 공사 기간 (개월/층) — 증축 층수 환산용 */
  perFloor: DurationStat
}

/** 이 사업의 공사 기간 추정 (개월) */
export interface DurationEstimate {
  base: number
  /** 보수 = 상위 사분위(더 길다) */
  conservative: number
  /** 낙관 = 하위 사분위 */
  optimistic: number
  count: number
  basis: string
}

export interface ConstructionCostSummary {
  /** 신축 단가에 적용한 집단 (표본이 없으면 null) */
  applied: ConstructionStat | null
  /** 비교용 집단 (서울 최근 3년 · 서울 전체 · 서울 외 최근 3년 · 서울 외 전체) */
  compare: ConstructionStat[]
  basisNote: string
}

/** 지상 N층 현장의 공사면적 기준 평당 공사비 (2026 환산, 만원) — 재건축 신축 단가 */
export interface FloorWorkCostStat {
  floors: number
  /** 평당 공사비 계산에 쓴 현장수 (공사면적이 없는 현장 제외) */
  count: number
  /** 그 층수의 전체 현장수 (통계제외 'Y' 제외, 엑셀 '현장수'와 같음) */
  siteCount: number
  /** 평균 · 중앙값 · 최소 · 최대 (만원/평, 공사면적 기준) — 엑셀 '하우빌드 2026환산' 4장 층수별 표의 F·G열 */
  meanManwon: number
  medianManwon: number
  minManwon: number
  maxManwon: number
  /** 공사 기간 중앙값 (개월), 자료가 없으면 null */
  monthsMedian: number | null
  /** 사례 이름 */
  sites: string[]
  /** 이 값이 5건 미만이면 true — 대표성이 낮음 */
  fewSamples: boolean
}

/** 6장 시나리오·민감도 (보고서 표시용 — 계산은 runAll().finance) */
export interface SiteScenarioSection {
  status: 'ok' | 'none' | 'pending'
  statusText: string | null
  /** [항목, 보수, 기준, 낙관] — 가정값 행 다음에 결과 행 */
  compareRows: ReportRow[]
  /** compareRows 중 가정값 행 수 (결과 행은 그 다음부터) */
  assumptionRowCount: number
  /** 토네이도 차트용 (기존 TornadoChart 형식) */
  tornado: SensitivityItem[]
  baseRoi: number | null
  /** [변수, 불리한 값 → ROI, 유리한 값 → ROI, 변동폭, 등급] */
  tornadoRows: ReportRow[]
  /** ROI 변동 중 등급 C·D 가정 비중 문장 */
  dependencyText: string
  /** 10년 누적 차트용 (기존 CashflowChart 형식) */
  cashflow: CashflowYear[]
  /** cashflowRows의 머리글 (자산가치 반영이면 7열, 아니면 5열) */
  cashflowHead: string[]
  /** 연차별 표 — 기준 시나리오 (자산가치 반영: [연차, NOI 증가, 누적 순증, 자산가치 차이, 자산가치 반영 순증, 안 함 순자산, 함 순자산]) */
  cashflowRows: ReportRow[]
  /** 자산가치 반영 지표를 계산했는지 */
  assetAdjusted: boolean
  /** 교차 지점 설명 한 문장 */
  assetCrossoverText: string
  /** [시나리오, 자산가치 반영 회수 연차, NPV, IRR, 기간 말 자산가치 반영 순증] */
  assetScenarioRows: ReportRow[]
  /** [시나리오, NPV, IRR, 회수 연차, 기간 말 누적 순증] */
  cashflowScenarioRows: ReportRow[]
  /** 현금흐름 기간 (년) */
  years: number
  notes: string[]
}

/** 4장 사업비 · 5장 임대수익 (보고서 표시용 — 계산은 runAll().finance) */
export interface SiteFinanceSection {
  status: 'ok' | 'none' | 'pending'
  /** 계산하지 못했을 때 안내 (ok면 null) */
  statusText: string | null
  /** 예: '기준 시나리오 (보수·낙관은 시나리오 표)' */
  scenarioLabel: string
  /** [항목, 금액, 산식·근거, 등급] */
  costRows: ReportRow[]
  /** [자금, 금액, 비고] */
  fundingRows: ReportRow[]
  /** [세대, 전용, 사례 구간, 월 환산 임대료, 참고: 구간 중위 보증금 / 월세] */
  unitRows: ReportRow[]
  /** [항목, 금액(연), 근거] */
  revenueRows: ReportRow[]
  /** ROI·회수기간·ROE·자산가치 증가 */
  kpis: Kpi[]
  /** [수익 시나리오, 전환율, 총사업비, 연 NOI 증가, ROI, 회수기간] */
  scenarioRows: ReportRow[]
  /** [항목, 사례 평균, 회귀식(전용 평 기준), 1평 증가당, 최소 임대면적 값] — 보증금·월세·월 환산 3행 */
  bandRows: ReportRow[]
  /** 임대 사례 표 아래 설명 (표본·회귀 범위·1평 증가당 임대료) */
  bandNote: string
  /** 토지 포함 수익률 문장 */
  yieldText: string
  notes: string[]
  /** 가정값 입력 엑셀 메모 (예: 층별 공사비 단가 안내) — 4장 아래 표시 */
  inputNotes: string[]
  /** 공사비 실적 근거 (기준 엑셀 '하우빌드 공사비') — 4장 표시 */
  construction: {
    /** [집단, ㎡당(연면적, 2026 환산) 중앙값, 평당(연면적) 중앙값, 평당(공사면적) 중앙값, 공사기간 중앙값] */
    rows: ReportRow[]
    /** 적용 집단 행 번호 (없으면 -1) */
    appliedRow: number
    /** [층수, 현장수, 평당(공사면적) 평균, 중앙값, 범위, ㎡당(공사면적) 평균 환산, 공사기간 중앙값] — 층수별 표 */
    floorRows: ReportRow[]
    /** 신축 단가에 적용한 층수 행 번호 (재건축이 아니거나 적용하지 않았으면 -1) */
    floorAppliedRow: number
    notes: string[]
  }
}

// ═════════════════════════════════════════════
// 수익성 가정값 레지스트리·임대 사례 (2026-10-08 결정 1~6·12)
// 값은 가정값 입력 엑셀 → lib/data/inputs/*.json, 항목 정의는 lib/rules/financeDefaults.ts
// ═════════════════════════════════════════════

/** 근거 등급 — A 공식 데이터·법령 / B 공개자료 기반 / C 프로젝트 가정 / D 근거 없음 */
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D'

/** 가정값 입력 엑셀 '가정값' 한 행 (inputs/assumptions.json) */
export interface AssumptionRow {
  key: string
  label: string | null
  unit: string | null
  /** 보수 (ROI에 불리한 값) */
  low: number | null
  base: number | null
  /** 낙관 (ROI에 유리한 값) */
  high: number | null
  grade: EvidenceGrade | null
  sourceTitle: string | null
  publisher: string | null
  baseDate: string | null
  url: string | null
  memo: string | null
}

/** 수익 시나리오에서 쓰는 가정값 하나 */
export interface ResolvedAssumption {
  key: string
  label: string
  unit: string
  /** 선택한 수익 시나리오의 값. 입력이 없으면 null (보고서 "입력 대기") */
  value: number | null
  range: { low: number | null; base: number | null; high: number | null }
  grade: EvidenceGrade | null
  /** 보고서 출처 표기 (자료명 · 기관 · 기준일) */
  sourceText: string | null
  url: string | null
  memo: string | null
  /** 사용자 입력으로 덮어썼는지 */
  overridden: boolean
}

/** 가정값 입력 엑셀 '임대사례' 한 행 (inputs/rentComps.json) — 금액은 만원 */
export interface RentComp {
  source: string | null
  contractDate: string | null
  district: string | null
  dong: string | null
  jibun: string | null
  floor: number | null
  rentType: '전세' | '월세' | string | null
  netAreaM2: number | null
  depositManwon: number | null
  monthlyManwon: number | null
  maintenanceManwon: number | null
  buildingUse: string | null
  builtYear: number | null
  newOrRenewal: string | null
  memo: string | null
}

/** 전월세 전환율 (결정 6) — 소수 (0.05 = 5%) */
export interface ConversionRates {
  /** 주택: 법정 상한 = min(연 10%, 기준금리 + 2%p) — 주택임대차보호법 제7조의2·시행령 제9조 */
  housing: { legalCap: number | null; market: number | null; applied: number | null; basis: string }
  /** 상가·사무실: 법정 상한 = min(연 12%, 기준금리 × 4.5) — 상가건물 임대차보호법 제12조·시행령 제5조 */
  commercial: { legalCap: number | null; market: number | null; applied: number | null; basis: string }
}

/** 임대 사례 요약 — 전용면적 구간 없이 평 기준 회귀직선 하나 (2026-10-12) */
export interface RentBandSummary {
  /** 구간 구분 없음 */
  band: 'ALL'
  label: string
  /** 사용한 신규 월세 계약 수 (회귀 적용 면적 상한 밖 사례 포함) */
  count: number
  /** 회귀를 맞춘 사례 수 (전용 fitMaxPyeong 이하) */
  fitCount: number
  /** 지역 — 당산동6가 사례가 부족하면 영등포구 포함 */
  area: string
  /** 사례의 전용면적 범위·평균 (평) — 최소 임대면적은 minPyeong */
  minPyeong: number | null
  maxPyeong: number | null
  meanPyeong: number | null
  /** 회귀를 맞춘 면적 상한 (평). null이면 전체 */
  fitMaxPyeong: number | null
  /** 사례 평균 보증금·월세 (원) */
  meanDepositWon: number | null
  meanMonthlyWon: number | null
  /** 보증금 = base + perPyeong × 평 (원, 원/평) */
  depositBaseWon: number | null
  depositPerPyeongWon: number | null
  /** 월세 = base + perPyeong × 평 (원/월, 원/평·월) */
  monthlyBaseWon: number | null
  monthlyPerPyeongWon: number | null
  /** 월 환산 임대료 = 월세 + 보증금 × 전환율 ÷ 12 = base + perPyeong × 평 (원/월, 원/평·월) */
  equivalentBaseWon: number | null
  equivalentPerPyeongWon: number | null
  /** 월 환산 회귀의 설명력 R² (0~1) */
  r2: number | null
}

// ═════════════════════════════════════════════
// 수익성 계산 결과 (설계서 5-4 [A][B][C], 2026-10-08 결정 1·2·6·12) — lib/calc/finance.ts calcSiteFinance
// 임대 모델(보증금 + 월세), 사업주체 = 대표 1인
// ═════════════════════════════════════════════

/** 사업비 항목 하나 */
export interface SiteCostItem {
  key: 'construction' | 'permit' | 'tax' | 'contingency' | 'finance' | 'demolition' | 'constructionLoss'
  label: string
  /** 금액 (원). 입력이 없어 반영하지 못하면 null */
  amountWon: number | null
  /** 산식·근거 한 줄 */
  basis: string
  grade: EvidenceGrade | null
}

/** 새 세대 하나의 예상 임대 조건 */
export interface SiteRentUnit {
  netAreaM2: number
  /** 전용면적 (평) = ㎡ ÷ 3.305785 */
  netAreaPyeong: number
  /** 월 환산 임대료 (원) = 고정분 + 평당 증가분 × 전용(평) (회귀직선) */
  monthlyEquivalentWon: number | null
  /** 참고: 같은 회귀로 추정한 보증금·월세 (원, 0 미만이면 0) */
  depositWon: number | null
  monthlyWon: number | null
  /** 회귀를 맞춘 면적 상한(평)을 넘어 외삽한 세대인지 */
  extrapolated: boolean
}

export interface SiteFinanceResult {
  scenario: FinanceScenarioId
  /** ok 계산 / none 증축·재건축안 없음 / pending 필수 가정값 입력 대기 */
  status: 'ok' | 'none' | 'pending'
  /** pending일 때 비어 있는 가정값 이름 */
  missing: string[]
  project: {
    kind: 'expansion' | 'rebuild'
    /** 증축(또는 신축) 연면적 (㎡, 용적률 기준) */
    gfaM2: number
    /** 공사 연면적 (㎡) — 재건축은 1층 필로티 포함 */
    constructionAreaM2: number
    units: SiteRentUnit[]
    /** 측면 보강부 전용면적 (㎡) — 세대 수에는 들어가지 않고 임대수입에만 반영 */
    sideNetM2: number
    /** 측면 보강부 월 환산 임대료 (원) */
    sideRentMonthlyWon: number | null
  }
  costs: SiteCostItem[]
  /** 총사업비 (원) = 반영된 항목 합 */
  totalCostWon: number | null
  loanWon: number | null
  equityWon: number | null
  revenue: {
    /** 연 임대수입 (공실 전, 원) = Σ 월 환산 임대료 × 12 */
    grossAnnualWon: number | null
    /** 관리비 수입 (연, 원) = 연 임대수입 × 관리비 비율 (2026-10-08 결정). 비율이 없으면 0 */
    maintenanceWon: number | null
    vacancyLossWon: number | null
    opexWon: number | null
    /** 기존 세대 연 임대수입·관리비·공실 손실 추정 (원, 공실 전) — 재건축 표의 기존 세대 행용 */
    existingGrossAnnualWon: number | null
    existingMaintenanceWon: number | null
    existingVacancyLossWon: number | null
    /** 새 세대 연 NOI (원) */
    noiWon: number | null
    /** 기존 세대 연 NOI 추정 (원) — 같은 임대 사례로 추정, 재건축이면 철거로 사라지는 수입 */
    existingNoiWon: number | null
    /** NOI 증가 (원) = 증축: 새 세대 NOI / 재건축: 새 NOI − 기존 NOI */
    noiIncreaseWon: number | null
    /** 참고: 새 세대 보증금 합계 (원) — 구간 중위 보증금 × 세대 수 */
    depositTotalWon: number | null
  }
  metrics: {
    /** 단순 ROI = NOI 증가 ÷ 총사업비 */
    roi: number | null
    /** 회수기간 (년) = 총사업비 ÷ NOI 증가 */
    paybackYears: number | null
    /** 자기자본수익률 = (NOI 증가 − 연 이자) ÷ 자기자본 */
    roe: number | null
    /** 자산가치 증가 (수익 기준) = NOI 증가 ÷ 환원율 */
    valueIncreaseWon: number | null
    netValueIncreaseWon: number | null
  }
  /** 토지 포함 수익률 (전·후) — 보조 지표 */
  landInclusiveYield: LandInclusiveYield | null
  conversion: ConversionRates
  rentBands: RentBandSummary[]
  /** 10년 현금흐름·NPV·IRR (설계서 5-4 [D]). 계산하지 못했으면 null */
  cashflow: SiteCashflow | null
  /** 사용한 가정값 (부록 표) */
  assumptions: ResolvedAssumption[]
  notes: string[]
}

/** 10년 현금흐름 한 해 (원) — 1년차 = NOI 증가, 2년차부터 임대료 상승률 반영 */
export interface SiteCashflowYear {
  year: number
  /** 그 해 NOI 증가 */
  noiIncreaseWon: number
  /** 증축(재건축) 순증 누적 = −총사업비 + NOI 증가 누적 */
  cumulativeNetWon: number
  /** "안 함": 기존 세대 NOI 누적 (추정, 상승률 반영) */
  withoutWon: number
  /** "함": 기존 NOI 누적 + 순증 누적 */
  withWon: number
  /** 자산가치(토지 + 건물, 원가 기준·상승률·감가 반영) — 안 함 / 함. 자산가치를 계산하지 못했으면 null */
  assetWithoutWon: number | null
  assetWithWon: number | null
  /** 순자산 = 자산가치 + 누적 NOI (함은 총사업비 차감) — 안 함 / 함 */
  netWorthWithoutWon: number | null
  netWorthWithWon: number | null
  /** 자산가치 반영 순증 = (함 자산 − 안 함 자산) + NOI 증가 누적 − 총사업비 */
  assetAdjustedNetWon: number | null
}

/** 자산가치 연차별 경로의 근거 (보고서 주석·부록) */
export interface AssetGrowthBasis {
  /** 건물(재조달단가) 연 상승률 — 건설공사비지수(주거용건물) 연평균 */
  buildingRate: number
  buildingBasis: string
  /** 토지 연 상승률 — 입력 전에는 0% */
  landRate: number
  landBasis: string
}

export interface SiteCashflow {
  years: SiteCashflowYear[]
  /** 임대료 상승률 (소수). 가정값이 없으면 null → 0% 적용 */
  growthRate: number | null
  /** 할인율 (소수). 없으면 NPV null */
  discountRate: number | null
  /** NPV = Σ NOI 증가 ÷ (1 + 할인율)^t − 총사업비 (10년 말 잔존가치 미반영) */
  npvWon: number | null
  /** IRR (총사업비 기준, 10년 말 잔존가치 미반영). 부호가 바뀌지 않으면 null */
  irr: number | null
  /** 누적 순증이 처음 0 이상이 되는 해. 10년 안에 회수하지 못하면 null */
  paybackYear: number | null
  /** 10년 말 누적 순증 */
  cumulativeNetWon: number
  /** 기존 NOI 추정이 없어 "안 함"을 0으로 둔 경우 true */
  existingNoiMissing: boolean
  /**
   * 자산가치 반영 (2026-10-12): 자산가치 증가분을 더한 회수·교차·NPV·IRR. 자산가치를 계산하지 못했으면 null.
   * 순자산(함) − 순자산(안 함) = 자산가치 차이 + NOI 증가 누적 − 총사업비.
   */
  assetAdjusted: {
    /** 자산가치 반영 순증이 처음 0 이상이 되는 해 (0 = 착공 직후부터 0 이상). 기간 안에 없으면 null */
    paybackYear: number | null
    /** 선형 보간한 회수 시점 (년, 소수). paybackYear가 null이면 null. 순자산 곡선(함·안 함)이 교차하는 시점과 같다 */
    paybackYearsExact: number | null
    /** 기간 말 자산가치 반영 순증 */
    cumulativeNetWon: number
    /** NPV·IRR — 기간 말에 자산가치 차이를 회수(잔존가치)한다고 보고 현금흐름에 더함 */
    npvWon: number | null
    irr: number | null
    /** 기간 말 자산가치 차이 (함 − 안 함) */
    terminalAssetDiffWon: number
    growth: AssetGrowthBasis
  } | null
}

/** 민감도 — 가정값 하나만 불리한 값 / 유리한 값으로 바꿨을 때 ROI (6장 토네이도) */
export interface SiteSensitivityItem {
  /** 가정값 키 또는 'rentFactor' */
  key: string
  label: string
  unit: string
  grade: EvidenceGrade | null
  /** ROI가 낮아지는 쪽 값 / 높아지는 쪽 값 (rentFactor는 배수 0.9 / 1.1) */
  unfavorableValue: number
  favorableValue: number
  roiUnfavorable: number
  roiFavorable: number
  /** ROI 변동폭 = roiFavorable − roiUnfavorable (항상 0 이상) */
  swing: number
}

export interface SiteSensitivityResult {
  /** 기준 시나리오 ROI */
  baseRoi: number
  /** 변동폭 큰 순 */
  items: SiteSensitivityItem[]
  /** 변동폭 합 중 등급 C·D 가정에서 오는 비율 (0~1) */
  gradeCShare: number | null
}
