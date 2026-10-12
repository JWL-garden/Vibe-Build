// 수익성 기본 규칙 (설계서 6-2) — 2026-10-08 결정 1~6·12
// 가정값 "값"은 가정값 입력 엑셀(lib/data/inputs/assumptions.json)에 있고, 이 파일은 항목 정의·법정 산식·산정 규칙만 둔다.

/** 토지가액 산정 방식 (설계서 5-4 [0]) — 공시지가 기준, 시세 아님 */
export const landValueRule = {
  /** 구성 필지 면적 합과 건축물대장 대지면적의 허용 차이 (㎡). 넘으면 '면적 확인 필요' */
  areaToleranceM2: 1,
  /** 화면·보고서 표기 */
  label: '개별공시지가 기준 (시세 아님)',
} as const

/**
 * 건물가치(원가 기준) 가정 (설계서 5-4 [C']) — 예시 가정값, 감정평가 아님 (2026-10-12 개정)
 *  - 기존 건물가치 = (기존 연면적 + 필로티 면적) × 신축단가표 단가 × 잔가율, 잔가율 = exp(−연 감가율 × 경과연수)
 *  - 신축·증축 건물가치 = 해당 공사의 공사비 전액 (재건축은 신축 공사비, 증축은 증축 공사비를 각각 적용)
 *  - 연 감가율 1.1%: 소하영 외, 국토연구 125호(2025) 서울 연립다세대 헤도닉 모형의 건물연식 계수 −0.011 (준로그 → 복리 감소).
 *    토지 + 건물 합산 면적당 매매가의 연식 효과이므로 건물만의 감가율보다 낮다.
 */
export const buildingValueRule = {
  /** 연 감가율 (소수) — 잔가율 = exp(−연 감가율 × 경과연수) */
  depreciationRatePerYear: 0.011,
  /** 최저 잔가율 (소수) — 오래돼도 이 비율 아래로 내려가지 않음 */
  minResidualRate: 0.1,
  note: '예시 가정값 (신축단가표 단가 · 연 1.1% 감가 · 잔가율) — 감정평가 아님',
} as const

export type LandValueRule = typeof landValueRule
export type BuildingValueRule = typeof buildingValueRule

/** 1평 = 3.305785㎡ */
export const PYEONG_M2 = 3.305785

/**
 * 가정값 항목 정의 — 가정값 입력 엑셀 '가정값' 시트의 키와 같다.
 * direction: 값이 클수록 ROI에 유리(higher) / 불리(lower) / 무관(none). 보수 = 불리한 쪽, 낙관 = 유리한 쪽 (assumptions.test.ts가 검사)
 * required: 수익성 계산에 반드시 필요 (없으면 "입력 대기")
 */
export const ASSUMPTION_SPEC = {
  baseRate: { unit: '%', direction: 'none', required: true },
  marketConversionHousing: { unit: '%', direction: 'higher', required: true },
  marketConversionCommercial: { unit: '%', direction: 'higher', required: false },
  expansionCostPerPyeong: { unit: '원/평', direction: 'lower', required: true },
  expansionCostPerUnit: { unit: '원/세대', direction: 'lower', required: true },
  newBuildCostTable: { unit: '원/㎡', direction: 'lower', required: false },
  newBuildCostExcel: { unit: '원/㎡', direction: 'lower', required: false },
  acquisitionTaxRate: { unit: '비율', direction: 'lower', required: true },
  loanInterestRate: { unit: '비율', direction: 'lower', required: true },
  loanRatio: { unit: '비율', direction: 'none', required: true },
  constructionMonths: { unit: '개월', direction: 'lower', required: true },
  rebuildConstructionMonths: { unit: '개월', direction: 'lower', required: true },
  vacancyRate: { unit: '비율', direction: 'lower', required: true },
  opexRate: { unit: '비율', direction: 'lower', required: true },
  // 관리비 수입 = 세대 월 환산 임대료 × 비율 (2026-10-08 결정). 입력값이 보수 3% > 낙관 1%라 ROI 방향과 반대 — 순서 검사 제외
  maintenanceFeePerUnit: { unit: '비율', direction: 'none', required: false },
  contingencyRate: { unit: '비율', direction: 'lower', required: true },
  capRate: { unit: '비율', direction: 'lower', required: true },
  rentGrowthRate: { unit: '비율', direction: 'higher', required: false },
  discountRate: { unit: '비율', direction: 'lower', required: false },
} as const

export type AssumptionKey = keyof typeof ASSUMPTION_SPEC

/**
 * 전월세 전환율 법정 상한 (결정 6) — 소수
 * 주택: min(연 10%, 기준금리 + 연 2%p) — 주택임대차보호법 제7조의2, 시행령 제9조
 * 상가: min(연 12%, 기준금리 × 4.5)    — 상가건물 임대차보호법 제12조, 시행령 제5조
 * 수익 시나리오: 보수 = 법정 상한, 기준·낙관 = 시장 전환율 (상가는 시장값이 없으면 입력 대기)
 */
export const conversionRule = {
  // fixedRate = true: 주택 전월세 전환율은 시나리오와 무관하게 가정값(marketConversionHousing, 연 6.0%)으로 고정한다 (2026-10-12 사용자 결정).
  // 법정 상한(5.0%)은 참고로만 표시 — false면 보수 시나리오에서 법정 상한을 쓴다
  housing: { maxRate: 0.1, addToBaseRate: 0.02, law: '주택임대차보호법 제7조의2·시행령 제9조', fixedRate: true },
  commercial: { maxRate: 0.12, baseRateMultiple: 4.5, law: '상가건물 임대차보호법 제12조·시행령 제5조' },
} as const

/**
 * 임대 사례 산정 규칙 — 연립·다세대 신규 월세 실거래, 최근 12개월, 당산동6가(부족하면 영등포구)
 * (2026-10-12 변경) 전용면적 구간을 나누지 않고, 사례의 전용면적(평)에 대한 보증금·월세의 **회귀직선(평균 기준 최소제곱)** 을 쓴다.
 *   보증금 = a + b × 평,  월세 = c + d × 평,  월 환산 임대료 = 월세 + 보증금 × 전환율 ÷ 12  (전환율 6.0% 고정)
 *   → 세대 임대료 = (월 환산 고정분) + (평당 증가분) × 전용(평). 최소 임대면적(표본 최소) 값과 1평당 증가분을 보고서에 보인다.
 * 회귀는 전용 regressionMaxPyeong 이하 사례로 맞추고 모든 면적에 적용한다 (그보다 큰 면적은 외삽 — 보고서에 표시).
 * 월세 계약만 쓴다 (전세는 월세가 없어 보증금이 섞이면 부풀려진다).
 */
export const rentCompRule = {
  months: 12,
  /** 당산동6가 사례가 이 값 이상이면 당산동6가만, 아니면 영등포구까지 */
  minSamples: 10,
  /** 신규 계약만 사용 (2026-10-08 결정 — 갱신 계약은 인상률 5% 상한으로 시장 임대료보다 낮을 수 있음) */
  contractTypes: ['신규'] as readonly string[],
  /** 회귀에 쓰는 계약 형태 */
  rentTypes: ['월세'] as readonly string[],
  /** 회귀를 맞추는 전용면적 상한 (평). 이 값을 넘는 사례는 회귀에서 뺀다 (큰 평형은 평당 단가가 꺾임). null이면 전체 */
  regressionMaxPyeong: 10 as number | null,
  label: '전용면적 구분 없음 (회귀)',
} as const

/**
 * 공사비 실적 산정 규칙 (2026-10-12) — 기준 엑셀 '하우빌드 공사비'(저층 주택 신축 도급 공사비, 건설공사비지수 2026 환산)
 * 재건축 신축 단가(가정값 newBuildCostExcel)가 비어 있을 때 이 규칙으로 자동 산정한다. 우선순위: 사용자 입력 > 가정값 입력 엑셀 > 이 규칙
 */
export const constructionCostRule = {
  /** 적용 권역 */
  region: '서울',
  /** 착공연도 범위 (최근 3개년) */
  startYearFrom: 2023,
  startYearTo: 2025,
  /** 표본이 이 값 미만이면 같은 권역 전체 기간으로 대체 (엑셀 유의: 5건 미만은 대표성 낮음) */
  minSamples: 5,
  /** 보수(ROI에 불리 = 비싼 쪽) = 상위 사분위, 낙관 = 하위 사분위 */
  conservativePercentile: 0.75,
  optimisticPercentile: 0.25,
  grade: 'B',
  note: '시공사 도급 공사비(VAT 포함) — 감리비·부담금 등 간접비 미포함',
} as const

/**
 * 재건축 신축 단가 — 지상 N층 현장의 공사면적 기준 평당 공사비 평균 (2026-10-12 결정)
 * 기준 엑셀 '하우빌드 2026환산' 4장 층수별 표 (예: 지상 6층 평균 564만원/평). 재건축 신축 단가는 이 값(공사면적 기준)과 건물신축단가표 중 높은 값.
 * 보수 = 표본 최대(비싼 쪽), 낙관 = 표본 최소. 표본이 minSamples 미만이면 보고서에 대표성 낮음을 표기한다.
 */
export const newBuildCostByFloorRule = {
  grade: 'C',
  minSamples: 5,
  note: '시공사 도급 공사비(VAT 포함, 토지 제외) — 감리비·부담금 등 간접비 미포함, 공사면적(지하·필로티 포함) 기준',
} as const

/**
 * 자산가치 연차별 경로의 상승률 (2026-10-12 결정)
 *  - 건물: 건설공사비지수(주거용건물) 연평균 상승률 — 기준 엑셀 '하우빌드 공사비'의 착공연도별 보정계수에서 계산 (calcBuildingCostGrowth)
 *  - 토지: 영등포구 지가변동률 시계열을 받기 전까지 0% (보수적). 값이 들어오면 landAnnualRate만 바꾼다.
 */
export const assetGrowthRule = {
  landAnnualRate: 0,
  landBasis: '영등포구 지가변동률 시계열 입력 대기 — 상승 없음(0%)으로 보수적 계산',
} as const

/** 현금흐름 기간 (2026-10-12 결정: 10년 → 20년). NPV·IRR·누적 비교의 기준 기간 */
export const cashflowRule = { years: 20 } as const
