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
  /** 증축층 바닥면적 상한 (㎡, 기존 최상층 또는 기준층). null = 건축면적으로 가정 */
  floorPlateM2: number | null
  /** 1층이 필로티(주차 전용)인지 */
  pilotiFloor1: boolean
  /**
   * 대지를 이루는 필지 PNU 목록 (대표 필지 포함). 토지가액 = Σ(필지 면적 × 공시지가).
   * 없으면(null) 외필지수 0일 때 대표 필지 하나로 보고, 외필지가 있으면 '추정'으로 계산한다.
   */
  lots?: string[] | null
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
  floorPlate: { areaM2: number; source: 'siteInput' | 'buildingArea' }
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
}

/** runAll 결과 — 화면·보고서는 이 값만 쓴다 */
export interface SiteAnalysis {
  pnu: string
  /** 선택한 법규 시나리오 */
  scenarioId: ScenarioId
  /** 시나리오별 증축 산정 결과 */
  byScenario: Record<ScenarioId, SiteExpansionResult>
  /** byScenario[scenarioId] */
  selected: SiteExpansionResult
  /** 토지가액 (공시지가 기준, 시나리오와 무관) */
  land: LandValueResult
  /** 선택 시나리오의 증축 전·후 자산가치 (원가 기준, 참고) */
  asset: AssetValueResult
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
    /** 재조달단가 (원/㎡, 예시 가정값) */
    unitCostWon: number
    /** 경과연수 (년, 기준일까지 만 연수). 사용승인일 없으면 null */
    ageYears: number | null
    usefulLifeYears: number
    /** 잔가율 (소수) = max(최저잔가율, 1 − 경과연수 ÷ 내용연수) */
    residualRate: number
    valueWon: number
  }
  addBuilding: {
    /** 증축 연면적 (㎡) — 선택 시나리오에서 채택된 증축안, 없으면 0 */
    gfaM2: number
    valueWon: number
  }
  /** 증축 전 자산가치 (원). 토지가액이 없으면 null */
  beforeWon: number | null
  /** 증축 후 자산가치 (원). 토지가액이 없으면 null */
  afterWon: number | null
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
  /** 'existing' 기존 주차로 가능 / 'parkingOption' 주차 추가 확보 조건 / 'none' 증축안 없음 */
  kind: 'existing' | 'parkingOption' | 'none'
  /** 계획안 제목 (예: '주차 1대 추가 확보 조건 증축안') */
  heading: string
  /** 증축안 (kind = none 이면 null) */
  plan: ExpansionPlan | null
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

/** 3장 증축 전·후 자산가치 (원가 기준 참고) */
export interface SiteAssetSection {
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
    scenarioId: ScenarioId
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
  /** 3장 증축 전·후 자산가치 */
  asset: SiteAssetSection
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
  }
  analysis: SiteAnalysis
}
