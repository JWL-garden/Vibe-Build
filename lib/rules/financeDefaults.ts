// 수익성 기본 규칙 (설계서 6-2) — 2026-10-08 결정 1~6·12
// 가정값 "값"은 가정값 입력 엑셀(lib/data/inputs/assumptions.json)에 있고, 이 파일은 항목 정의·법정 산식·산정 규칙만 둔다.

/** 토지가액 산정 방식 (설계서 5-4 [0]) — 공시지가 기준, 시세 아님 */
export const landValueRule = {
  /** 구성 필지 면적 합과 건축물대장 대지면적의 허용 차이 (㎡). 넘으면 '면적 확인 필요' */
  areaToleranceM2: 1,
  /** 화면·보고서 표기 */
  label: '개별공시지가 기준 (시세 아님)',
} as const

/** 건물가치(원가 기준) 가정 (설계서 5-4 [C']) — 예시 가정값, 감정평가 아님 */
export const buildingValueRule = {
  /** 재조달단가 (원/㎡) — 같은 건물을 지금 새로 짓는 단가 */
  replacementCostPerM2Won: 2_000_000,
  /** 구조별 내용연수 (년). 목록에 없으면 default */
  usefulLifeYears: { 철근콘크리트구조: 50, default: 50 } as Record<string, number>,
  /** 최저 잔가율 (소수) — 오래돼도 이 비율 아래로 내려가지 않음 */
  minResidualRate: 0.1,
  note: '예시 가정값 (재조달단가·내용연수·잔가율) — 감정평가 아님',
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
  maintenanceFeePerUnit: { unit: '원/월', direction: 'higher', required: false },
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
  housing: { maxRate: 0.1, addToBaseRate: 0.02, law: '주택임대차보호법 제7조의2·시행령 제9조' },
  commercial: { maxRate: 0.12, baseRateMultiple: 4.5, law: '상가건물 임대차보호법 제12조·시행령 제5조' },
} as const

/**
 * 임대 사례 산정 규칙 (결정 5) — 연립·다세대 전월세 실거래, 최근 12개월, 당산동6가(부족하면 영등포구)
 * 구간별 중위값을 쓴다. 사례 수가 minSamples 미만이면 "사례 부족" 표시.
 */
export const rentCompRule = {
  months: 12,
  minSamples: 10,
  /** 신규 계약만 사용 (2026-10-08 결정 — 갱신 계약은 인상률 5% 상한으로 시장 임대료보다 낮을 수 있음) */
  contractTypes: ['신규'] as readonly string[],
  bands: [
    { band: 'S', label: '전용 0~30㎡', maxNetM2: 30 },
    { band: 'M', label: '전용 30~60㎡', maxNetM2: 60 },
  ],
} as const
