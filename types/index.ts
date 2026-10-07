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
}

/** 주택 층수·연면적 한도를 적용하는 주택 유형 (건축법 시행령 별표1) */
export type HousingType = '다세대' | '다가구' | '다중주택'

/** 주택 층수·연면적 한도 (설계서 5-3b) */
export interface HousingRule {
  /** 주택으로 쓰는 층수 한도 (개층) — 현행 3, 완화 4 */
  maxFloors: Record<HousingType, number>
  /** 주택 바닥면적 합계 한도 (㎡) — 현행 660, 완화 1,000 */
  maxAreaM2: Record<HousingType, number>
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
}

/** 객체 안쪽까지 모두 선택 항목으로 만드는 도우미 타입 */
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** 법규 시나리오 id */
export type ScenarioId = 'BASE' | 'A' | 'B' | 'C' | 'ALL'

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
export type LimitingFactor = 'parking' | 'far' | 'housingArea' | 'housingFloors' | 'sunlight' | 'other'

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
}

/** 증축 가능 여부 판정 — pending: 계산 엔진 연결 전(판정 대기) */
export interface Expandability {
  status: 'pending' | 'possible' | 'impossible'
  /** 화면에 보여줄 설명 */
  reason: string
}
